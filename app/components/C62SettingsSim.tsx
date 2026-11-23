"use client";

import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Ubuntu } from "next/font/google";
import {
  allSettings,
  rogerStyles,
  rogerSteps,
  simBadgeLabels,
  topMenu,
  type SimBadge,
  type SimEntry,
  type SimMenu,
} from "@/data/c62Settings";

// The radio's screen font is Ubuntu Regular, as a bitmap
const ubuntu = Ubuntu({ weight: "400", subsets: ["latin"] });

// The C62's screen: 160 x 128, a top bar, then rows of 16 pixels
const W = 160;
const H = 128;
const TOP = 16;
const ROW = 16;
const ROWS = 6;
const AMBER = "#fab413";

type Level = { menu: SimMenu; sel: number; path: string };
type Mode = "main" | "menu" | "page" | "reset";
type Key = "green" | "red" | "up" | "down";

// Roger beeps through the browser: one oscillator that changes frequency
// without a gap, as the radio's tone generator does
let audio: AudioContext | null = null;
let playing: { osc: OscillatorNode; gain: GainNode } | null = null;

function playRoger(name: string) {
  const steps = rogerSteps(name);
  if (steps.length === 0 || typeof window === "undefined") return 0;
  if (!audio) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audio = new Ctx();
  }
  void audio.resume();
  if (playing) {
    playing.osc.stop();
    playing = null;
  }

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.connect(gain).connect(audio.destination);

  const level = 0.18;
  const ramp = 0.004; // seconds: no clicks where it starts and stops
  let t = audio.currentTime + 0.03;
  const start = t;
  gain.gain.setValueAtTime(0, t);
  let on = false;
  for (const step of steps) {
    if (step.hz > 0) {
      osc.frequency.setValueAtTime(step.hz, t);
      if (!on) gain.gain.setTargetAtTime(level, t, ramp);
      on = true;
    } else if (on) {
      gain.gain.setTargetAtTime(0, t, ramp);
      on = false;
    }
    t += step.ms / 1000;
  }
  gain.gain.setTargetAtTime(0, t, ramp);
  osc.start(start);
  osc.stop(t + 0.05);
  playing = { osc, gain };
  osc.onended = () => {
    if (playing?.osc === osc) playing = null;
  };
  return (t - start) * 1000;
}

const startValues = () => Object.fromEntries(allSettings().map(({ key, start }) => [key, start]));

// In text, {name} is a key on the radio
function KeyText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\{[^}]+\})/g).map((part, i) => {
        const match = /^\{([^}]+)\}$/.exec(part);
        if (!match) return part;
        const name = match[1];
        const tone =
          name === "green"
            ? "border-emerald-600 text-emerald-700"
            : name === "red"
              ? "border-red-600 text-red-700"
              : "border-neutral-300 text-neutral-700";
        return (
          <kbd
            key={i}
            className={`mx-0.5 inline-block min-w-[1.7em] border border-b-2 bg-neutral-50 px-1.5 text-center font-mono text-[0.8em] leading-normal ${tone}`}
          >
            {name === "up" ? "▲" : name === "down" ? "▼" : name}
          </kbd>
        );
      })}
    </>
  );
}

function Badge({ badge }: { badge: SimBadge }) {
  const dot =
    badge === "c62" ? "bg-sky-500" : badge === "saved" ? "bg-emerald-500" : badge === "channel" ? "bg-amber-500" : "bg-neutral-300";
  return (
    <span className="inline-flex items-center gap-1.5 border border-neutral-200 px-2 py-0.5 font-mono text-xs whitespace-nowrap text-neutral-600">
      <span className={`size-1.5 ${dot}`} aria-hidden="true" />
      {simBadgeLabels[badge]}
    </span>
  );
}

/** The value shown at the right of a row */
function valueText(entry: SimEntry, values: Record<string, number>, key: string): string {
  if (entry.values) return entry.values[values[key] ?? entry.start ?? 0]?.label ?? "";
  if (entry.typed !== undefined) return entry.typed.length > 7 ? `${entry.typed.slice(0, 7)}*` : entry.typed;
  return "";
}

export default function C62SettingsSim() {
  const [mode, setMode] = useState<Mode>("main");
  const [stack, setStack] = useState<Level[]>([]);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, number>>(startValues);
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [pressed, setPressed] = useState<Key | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  const level = stack[stack.length - 1];
  const entry = level ? level.menu.entries[level.sel] : undefined;
  const entryKey = level && entry ? `${level.path}/${entry.id}` : "";

  const press = useCallback(
    (key: Key) => {
      setPressed(key);
      window.setTimeout(() => setPressed((k) => (k === key ? null : k)), 120);

      if (mode === "main") {
        if (key === "green") {
          setStack([{ menu: topMenu, sel: 0, path: "" }]);
          setMode("menu");
        }
        return;
      }

      if (mode === "page" || mode === "reset") {
        if (mode === "reset" && key === "green") {
          if (resetStep === 0) setResetStep(1);
          else if (resetStep === 1) {
            setValues(startValues());
            setResetStep(2);
          } else {
            setMode("menu");
            setResetStep(0);
          }
          return;
        }
        if (key === "red" || key === "green") {
          setMode("menu");
          setResetStep(0);
        }
        return;
      }

      if (!level || !entry) return;
      const n = level.menu.entries.length;

      if (editing && entry.values) {
        const count = entry.values.length;
        const cur = values[entryKey] ?? entry.start ?? 0;
        if (key === "up" || key === "down") {
          let next: number;
          // On / off settings: up turns on, down turns off
          if (entry.values[0]?.label === "ON" && count === 2) next = key === "up" ? 0 : 1;
          else next = (cur + (key === "up" ? 1 : -1) + count) % count;
          setValues((v) => ({ ...v, [entryKey]: next }));
          if (entry.id === "roger") playRoger(entry.values[next].label);
        } else {
          setEditing(false);
        }
        return;
      }

      if (key === "up" || key === "down") {
        const sel = (level.sel + (key === "down" ? 1 : -1) + n) % n;
        setStack((s) => [...s.slice(0, -1), { ...level, sel }]);
      } else if (key === "green") {
        if (entry.menu) setStack((s) => [...s, { menu: entry.menu!, sel: 0, path: entryKey }]);
        else if (entry.page) setMode("page");
        else if (entry.reset) {
          setResetStep(0);
          setMode("reset");
        } else if (entry.values) setEditing(true);
      } else if (key === "red") {
        if (stack.length > 1) setStack((s) => s.slice(0, -1));
        else {
          setStack([]);
          setMode("main");
        }
      }
    },
    [mode, level, entry, entryKey, editing, values, stack.length, resetStep],
  );

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, Key> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "red",
      ArrowRight: "green",
      Enter: "green",
      Escape: "red",
      Backspace: "red",
    };
    const key = map[e.key];
    if (key) {
      e.preventDefault();
      press(key);
    }
  };

  /** Jump straight to an entry, from the map under the radio */
  const jump = useCallback((path: number[]) => {
    const levels: Level[] = [];
    let menu = topMenu;
    let p = "";
    for (let i = 0; i < path.length; i++) {
      levels.push({ menu, sel: path[i], path: p });
      const e = menu.entries[path[i]];
      if (i < path.length - 1 && e.menu) {
        p = `${p}/${e.id}`;
        menu = e.menu;
      }
    }
    setStack(levels);
    setMode("menu");
    setEditing(false);
    setResetStep(0);
    stage.current?.focus({ preventScroll: true });
    stage.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const breadcrumb = ["Menu", ...stack.slice(1).map((l) => l.menu.title)];

  return (
    <div className="space-y-12">
      <div
        ref={stage}
        tabIndex={0}
        onKeyDown={onKey}
        aria-label="C62 menu simulator: arrow keys move, enter selects, escape goes back"
        className="grid scroll-mt-28 grid-cols-1 gap-10 outline-none focus-visible:ring-1 focus-visible:ring-neutral-300 focus-visible:ring-offset-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]"
      >
        {/* The radio */}
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-[2rem] bg-neutral-900 p-5 shadow-xl">
            <div className="rounded-md bg-neutral-950 p-2 ring-1 ring-neutral-700">
              <Screen
                mode={mode}
                level={level}
                editing={editing}
                values={values}
                resetStep={resetStep}
                entry={entry}
                fontFamily={ubuntu.style.fontFamily}
              />
            </div>
            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <RadioKey label="green" colour="green" pressed={pressed === "green"} onPress={() => press("green")}>
                <span className="block h-1.5 w-8 rounded-full bg-emerald-500" />
              </RadioKey>
              <div className="flex flex-col overflow-hidden rounded-full border border-neutral-600">
                <RadioKey label="up" round pressed={pressed === "up"} onPress={() => press("up")}>
                  ▲
                </RadioKey>
                <RadioKey label="down" round pressed={pressed === "down"} onPress={() => press("down")}>
                  ▼
                </RadioKey>
              </div>
              <RadioKey label="red" colour="red" pressed={pressed === "red"} onPress={() => press("red")}>
                <span className="block h-1.5 w-8 rounded-full bg-red-500" />
              </RadioKey>
            </div>
          </div>
          <p className="mt-4 text-center font-mono text-xs text-neutral-400">
            click the keys, or click the radio and use ↑ ↓ enter esc
          </p>
        </div>

        {/* What's on screen */}
        <div className="min-w-0" aria-live="polite">
          <Explain
            mode={mode}
            breadcrumb={breadcrumb}
            level={level}
            entry={entry}
            editing={editing}
            current={entry?.values ? (values[entryKey] ?? entry.start ?? 0) : undefined}
            resetStep={resetStep}
          />
        </div>
      </div>

      <RogerBeeps />

      <MenuMap onJump={jump} stack={stack} mode={mode} />
    </div>
  );
}

function RadioKey({
  label,
  colour,
  round,
  pressed,
  onPress,
  children,
}: {
  label: string;
  colour?: "green" | "red";
  round?: boolean;
  pressed: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      tabIndex={-1}
      className={`flex items-center justify-center bg-neutral-800 text-neutral-300 transition-transform select-none hover:bg-neutral-700 ${
        round ? "h-9 w-16 text-sm" : "h-12 rounded-xl"
      } ${pressed ? "translate-y-px bg-neutral-700" : ""} ${colour ? "border border-neutral-700" : ""}`}
    >
      {children}
    </button>
  );
}

function Screen({
  mode,
  level,
  editing,
  values,
  resetStep,
  entry,
  fontFamily,
}: {
  mode: Mode;
  level?: Level;
  editing: boolean;
  values: Record<string, number>;
  resetStep: 0 | 1 | 2;
  entry?: SimEntry;
  fontFamily: string;
}) {
  const text = { fontFamily, fontSize: 12.5 };

  let body: React.ReactNode;
  if (mode === "main") {
    body = <image href="/projects/c62-manual/fm-1-idle.png" x={0} y={0} width={W} height={H} style={{ imageRendering: "pixelated" }} />;
  } else if (mode === "page" && entry?.page) {
    body = entry.page.image ? (
      <image href={entry.page.image} x={0} y={0} width={W} height={H} style={{ imageRendering: "pixelated" }} />
    ) : (
      <>
        <text x={W / 2} y={12} textAnchor="middle" fill="#fff" {...text}>
          {entry.name}
        </text>
        {entry.page.lines?.map((line, i) => (
          <text key={line + i} x={W / 2} y={44 + i * ROW} textAnchor="middle" fill={i === 0 ? "#fff" : "#999"} {...text}>
            {line}
          </text>
        ))}
      </>
    );
  } else if (mode === "reset") {
    const lines =
      resetStep === 0
        ? ["Reset to Defaults", "press green to arm"]
        : resetStep === 1
          ? ["Press green again", "to reset everything"]
          : ["Settings reset", "press green"];
    body = (
      <>
        <text x={W / 2} y={12} textAnchor="middle" fill="#fff" {...text}>
          Reset
        </text>
        {lines.map((line, i) => (
          <text
            key={line}
            x={W / 2}
            y={58 + i * 18}
            textAnchor="middle"
            fill={resetStep === 1 && i === 0 ? AMBER : "#fff"}
            {...text}
          >
            {line}
          </text>
        ))}
      </>
    );
  } else if (level) {
    const first = Math.max(0, Math.min(level.sel - (ROWS - 1), level.menu.entries.length - ROWS));
    const visible = level.menu.entries.slice(first, first + ROWS);
    body = (
      <>
        <text x={W / 2} y={12} textAnchor="middle" fill="#fff" {...text}>
          {level.menu.title}
        </text>
        {visible.map((e, i) => {
          const index = first + i;
          const selected = index === level.sel;
          const y = TOP + 4 + i * ROW;
          const key = `${level.path}/${e.id}`;
          const fg = selected ? "#000" : "#fff";
          return (
            <g key={e.id}>
              {selected && <rect x={0} y={y} width={W} height={ROW} fill={editing ? AMBER : "#fff"} />}
              <text x={4} y={y + 12.5} fill={fg} {...text}>
                {e.name}
              </text>
              <text x={W - 3} y={y + 12.5} textAnchor="end" fill={fg} {...text}>
                {valueText(e, values, key)}
              </text>
            </g>
          );
        })}
      </>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full bg-black" role="img" aria-label="the radio's screen">
      {body}
    </svg>
  );
}

function Explain({
  mode,
  breadcrumb,
  level,
  entry,
  editing,
  current,
  resetStep,
}: {
  mode: Mode;
  breadcrumb: string[];
  level?: Level;
  entry?: SimEntry;
  editing: boolean;
  current?: number;
  resetStep: 0 | 1 | 2;
}) {
  if (mode === "main" || !level || !entry) {
    return (
      <div className="space-y-4">
        <p className="font-mono text-sm text-neutral-400">main screen</p>
        <h2 className="text-2xl font-semibold sm:text-3xl">the radio is on</h2>
        <p className="text-lg leading-relaxed text-neutral-600">
          <KeyText text="this is FM mode in VFO, tuned to 146.520. press {green} to open the menu, then {up} / {down} to move and {green} to open or change something. {red} goes back." />
        </p>
      </div>
    );
  }

  const hint =
    mode === "page"
      ? "{red} goes back."
      : mode === "reset"
        ? resetStep === 2
          ? "every setting is back to how it started. {green} goes back."
          : "{green} to go on, {red} to cancel."
        : editing
          ? "{up} / {down} change the value. {green} or {red} finishes."
          : entry.menu
            ? "{green} opens it."
            : entry.values
              ? "{green} to change it."
              : entry.typed !== undefined
                ? "typed on the number keys on the radio, like an old phone. not here though."
                : entry.page || entry.reset
                  ? "{green} opens it."
                  : "";

  const values = entry.values;
  const shortList = values && values.length <= 9;
  const note = values && current !== undefined ? values[current]?.note : undefined;

  return (
    <div className="space-y-5">
      <p className="font-mono text-sm text-neutral-400">{breadcrumb.join(" › ")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-2xl font-semibold sm:text-3xl">{entry.name}</h2>
        {entry.badges?.map((b) => <Badge key={b} badge={b} />)}
      </div>
      <p className="text-lg leading-relaxed text-neutral-600">
        <KeyText text={entry.explain} />
      </p>

      {values && current !== undefined && (
        <div className="space-y-3">
          {shortList ? (
            <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
              {values.map((v, i) => (
                <li
                  key={v.label}
                  className={`flex gap-4 px-2 py-2 text-sm ${i === current ? "bg-amber-50" : ""}`}
                >
                  <span
                    className={`w-20 shrink-0 font-mono ${i === current ? "font-semibold text-neutral-900" : "text-neutral-500"}`}
                  >
                    {v.label}
                  </span>
                  {entry.id === "roger" && i > 0 && (
                    <button
                      type="button"
                      onClick={() => playRoger(v.label)}
                      aria-label={`play ${v.label}`}
                      className="-my-0.5 shrink-0 border border-neutral-300 px-1.5 font-mono text-xs text-neutral-600 transition-colors hover:border-neutral-900 hover:text-neutral-900"
                    >
                      ▶
                    </button>
                  )}
                  <span className={i === current ? "text-neutral-800" : "text-neutral-500"}>
                    {v.note ? <KeyText text={v.note} /> : null}
                    {i === (entry.start ?? 0) ? (
                      <span className="ml-1 font-mono text-xs text-neutral-400">{v.note ? " · " : ""}starts here</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-y border-neutral-200 px-2 py-3 text-sm text-neutral-600">
              <span className="font-mono font-semibold text-neutral-900">{values[current].label}</span>
              <span className="text-neutral-400">
                {" "}
                · {values.length} values, from {values[0].label} to {values[values.length - 1].label}. starts at{" "}
                {values[entry.start ?? 0].label}.
              </span>
              {note && (
                <span className="mt-1 block">
                  <KeyText text={note} />
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {entry.menu && (
        <ul className="flex flex-wrap gap-2">
          {entry.menu.entries.map((e) => (
            <li key={e.id} className="border border-neutral-200 px-2 py-0.5 font-mono text-xs text-neutral-500">
              {e.name}
            </li>
          ))}
        </ul>
      )}

      <p className="border-l-2 border-neutral-300 pl-4 text-sm leading-relaxed text-neutral-500">
        <KeyText text={hint} />
      </p>
    </div>
  );
}

/** A little chart of a roger beep: pitch against time */
function RogerChart({ name, active }: { name: string; active: boolean }) {
  const steps = rogerSteps(name);
  const total = steps.reduce((a, s) => a + s.ms, 0);
  const lo = 500;
  const hi = 2400;
  const w = 120;
  const h = 32;
  // Where each step starts, ms
  const starts = steps.map((_, i) => steps.slice(0, i).reduce((a, s) => a + s.ms, 0));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" aria-hidden="true">
      <line x1={0} y1={h - 0.5} x2={w} y2={h - 0.5} className="stroke-neutral-200" />
      {steps.map((s, i) => {
        const x = (starts[i] / total) * w;
        if (s.hz === 0) return null;
        const y = h - 2 - ((s.hz - lo) / (hi - lo)) * (h - 6);
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={Math.max((s.ms / total) * w, 0.6)}
            height={2.5}
            className={active ? "fill-amber-500" : "fill-neutral-800"}
          />
        );
      })}
    </svg>
  );
}

/** Every roger beep style, to hear */
function RogerBeeps() {
  const [active, setActive] = useState<string | null>(null);
  const play = (name: string) => {
    const ms = playRoger(name);
    setActive(name);
    window.setTimeout(() => setActive((a) => (a === name ? null : a)), ms + 60);
  };
  return (
    <section aria-label="roger beeps" className="border-t border-neutral-900 pt-6">
      <p className="font-mono text-xs tracking-wide text-neutral-400 uppercase">roger beeps: click one to hear it</p>
      <p className="mt-3 max-w-3xl leading-relaxed text-neutral-600">
        the sound the radio sends when you let go of PTT, picked in settings &gt; FM &gt; roger beep. these are the same tones and timings as
        the firmware, as pure tones: on air they go through the radio&apos;s audio filters and the other radio&apos;s speaker.
      </p>
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rogerStyles.map((r) => (
          <li key={r.name}>
            <button
              type="button"
              onClick={() => play(r.name)}
              className={`group flex h-full w-full flex-col gap-2 border p-3 text-left transition-colors ${
                active === r.name ? "border-amber-500 bg-amber-50" : "border-neutral-200 hover:border-neutral-900"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold text-neutral-900">{r.name}</span>
                <span className="font-mono text-xs text-neutral-400 group-hover:text-neutral-900">▶</span>
              </span>
              <RogerChart name={r.name} active={active === r.name} />
              <span className="text-sm leading-snug text-neutral-500">{r.note}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Every menu and setting, one block per menu, as links that jump the radio there */
function MenuMap({ onJump, stack, mode }: { onJump: (path: number[]) => void; stack: Level[]; mode: Mode }) {
  const here = useMemo(() => (mode === "main" ? [] : stack.map((l) => l.sel)), [stack, mode]);
  const isHere = (path: number[]) => path.length === here.length && path.every((p, i) => p === here[i]);

  // Each menu with the path that opens it
  const groups: { title: string; trail: string; menu: SimMenu; path: number[] }[] = [];
  const walk = (menu: SimMenu, path: number[], trail: string) => {
    groups.push({ title: menu.title, trail, menu, path });
    menu.entries.forEach((e, i) => {
      if (e.menu) walk(e.menu, [...path, i], trail ? `${trail} › ${menu.title}` : menu.title);
    });
  };
  walk(topMenu, [], "");

  return (
    <nav aria-label="every menu" className="border-t border-neutral-900 pt-6">
      <p className="font-mono text-xs tracking-wide text-neutral-400 uppercase">every menu: click one to go there</p>
      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-8 text-sm sm:grid-cols-3 lg:grid-cols-5">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="font-mono text-xs text-neutral-400">{g.trail ? `${g.trail} ›` : "\u00a0"}</p>
            <p className="font-semibold text-neutral-900">{g.title}</p>
            <ul className="mt-2 space-y-1">
              {g.menu.entries.map((e, i) => {
                const p = [...g.path, i];
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onJump(p)}
                      className={`text-left transition-colors hover:text-neutral-900 ${
                        isHere(p) ? "font-semibold text-neutral-900" : "text-neutral-500"
                      }`}
                    >
                      {e.name}
                      {e.menu ? " ›" : ""}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
