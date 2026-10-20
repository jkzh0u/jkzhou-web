"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { albums } from "@/data/albums";
import VideoModal, { type VideoItem } from "./Videomodal";
import Signature, { SIGNATURE_DRAW_MS } from "./signature";

type DeckCard = {
  kind: "photo" | "video";
  title: string;
  subtitle: string;
  image: string;
  href?: string;
  video?: VideoItem;
};

// Layout. 4 cards sit in a clean row. Raise MAX_CARDS and the row squeezes
// itself, so the cards start to overlap like a hand of cards.
const MAX_CARDS = 4;
const ANGLE = 6.5; // degrees of tilt per step away from the middle
const DROP = 0.012; // outer cards sit lower (fraction of card height per step squared)
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const PAPER = "#f6f2ea";

// Intro timing
const HOLD_MS = 350; // pause after the signature finishes, before the spread
const SPREAD_MS = 1000; // how long each card takes to travel to the row
const SPREAD_STAGGER = 60; // extra delay per step away from the middle

// Hover feel. Both are critically damped springs (no overshoot).
// `response` is roughly how long, in seconds, the move takes to land.
const LIFT = 5; // how far a hovered card rises, % of its height
const LIFT_SCALE = 0.03; // how much it grows
const LIFT_RESPONSE = 0.4;
const FLIP_RESPONSE = 0.75;

// albums.ts is read newest first, so the first entries land in the middle
const photoCards: DeckCard[] = albums
  .filter((a) => a.cover)
  .map((a) => ({
    kind: "photo",
    title: a.title,
    subtitle: a.subtitle,
    image: `/photos/${a.slug}/${encodeURIComponent(a.cover)}`,
    href: `/photos/${a.slug}`,
  }));

// photo, video, photo, video... so the row always shows both
function interleave<T>(a: T[], b: T[], max: number) {
  const out: T[] = [];
  for (let i = 0; out.length < max && (i < a.length || i < b.length); i++) {
    if (i < a.length && out.length < max) out.push(a[i]);
    if (i < b.length && out.length < max) out.push(b[i]);
  }
  return out;
}

// One step of a critically damped spring. It always moves from wherever the
// value is right now and keeps its velocity, so reversing mid-flip is smooth.
function spring(x: number, v: number, target: number, response: number, dt: number) {
  const w = (2 * Math.PI) / response;
  const steps = Math.max(1, Math.ceil(dt / 0.004));
  const h = dt / steps;
  for (let s = 0; s < steps; s++) {
    v += (w * w * (target - x) - 2 * w * v) * h;
    x += v * h;
  }
  return [x, v] as const;
}

const hitIndex = (el: EventTarget | null) => {
  const hit = (el as HTMLElement | null)?.closest?.("[data-hit]") as HTMLElement | null;
  return hit ? Number(hit.dataset.hit) : null;
};

// The name repeated around an oval, like the ring on a Cartelago back.
// 5 repeats of 15 characters, with a small star between each name.
const RING_TEXT = "JACKSON ZHOU ✦ ".repeat(5);

function CardBack({ animate, dim }: { animate: boolean; dim: boolean }) {
  const ringId = useId();
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[12px] bg-[#0b0b0b]"
      style={{
        backgroundImage:
          "radial-gradient(120% 80% at 28% 12%, rgba(255,255,255,0.08), transparent 55%)",
      }}
    >
      <svg viewBox="0 0 200 280" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <path id={ringId} d="M100 24A76 116 0 1 1 100 256A76 116 0 1 1 100 24" fill="none" />
        </defs>
        <text
          fill="rgba(255,255,255,0.9)"
          style={{
            fontFamily: "ui-serif, Georgia, 'Times New Roman', serif",
            fontSize: 9,
            letterSpacing: 1.6,
            textRendering: "geometricPrecision",
          }}
        >
          {/* textLength stretches the text to close the loop exactly */}
          <textPath href={`#${ringId}`} textLength={606} lengthAdjust="spacing">
            {RING_TEXT}
          </textPath>
        </text>

      </svg>

      {/* your signature */}
      <div className="absolute left-1/2 top-1/2 w-[40%] -translate-x-1/2 -translate-y-1/2">
        <Signature animate={animate} className="h-auto w-full text-white/90" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 bg-black transition-opacity duration-300"
        style={{ opacity: dim ? 0.35 : 0 }}
      />
    </div>
  );
}

export default function CardHero({ videos }: { videos: VideoItem[] }) {
  const router = useRouter();

  // Newest card in the middle, older ones alternating outward to each side.
  // `rank` is recency (0 = newest) and also decides the A, 2, 3... corner index.
  const deck = useMemo(() => {
    // newest is last in the JSON, so reverse it like the videos page does
    const videoCards: DeckCard[] = [...videos].reverse().map((v) => ({
      kind: "video",
      title: v.title,
      subtitle: `${v.tag} · ${v.year}`,
      image: v.poster,
      video: v,
    }));
    const ranked = interleave(photoCards, videoCards, MAX_CARDS); // newest first
    const m = ranked.length;
    const c = (m - 1) / 2;

    // row positions ordered from the middle outward (right side wins ties)
    const slots = Array.from({ length: m }, (_, i) => i).sort(
      (a, b) => Math.abs(a - c) - Math.abs(b - c) || b - a
    );

    const out: { card: DeckCard; rank: number }[] = new Array(m);
    slots.forEach((slot, rank) => {
      out[slot] = { card: ranked[rank], rank };
    });
    return out;
  }, [videos]);

  const n = deck.length;
  const mid = (n - 1) / 2;
  const topSlot = deck.findIndex((d) => d.rank === 0);

  // Where each card lives in the finished row. --step is set on the wrapper.
  const rowTransform = (i: number) => {
    const d = i - mid;
    return `translate(calc(${d} * var(--step)), calc(${d * d * DROP} * var(--h))) rotate(${d * ANGLE}deg)`;
  };

  // The messy stack the cards start in: top card straight-ish, the rest askew
  const stackTransform = (i: number, isTop: boolean) => {
    if (isTop) return "translate(0px, 0px) rotate(5deg)";
    const rot = (((i * 53) % 11) - 5) * 1.6;
    const tx = (((i * 29) % 7) - 3) * 3;
    const ty = (((i * 17) % 5) - 2) * 3;
    return `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
  };

  const [phase, setPhase] = useState<"stack" | "spread">("stack");
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [video, setVideo] = useState<VideoItem | null>(null);

  const hoveredRef = useRef<number | null>(null);
  const pointerType = useRef("mouse");
  const kick = useRef<() => void>(() => {});
  const slotEls = useRef<(HTMLDivElement | null)[]>([]);
  const liftEls = useRef<(HTMLDivElement | null)[]>([]);
  const flipEls = useRef<(HTMLDivElement | null)[]>([]);
  const infoEls = useRef<(HTMLDivElement | null)[]>([]);

  const setHover = useCallback((i: number | null) => {
    if (hoveredRef.current === i) return;
    hoveredRef.current = i;
    setHovered(i);
    kick.current();
  }, []);

  // signature draws on the top card -> cards travel to the row -> hover active
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      setPhase("spread");
      setReady(true);
      return;
    }
    const spreadAt = SIGNATURE_DRAW_MS + HOLD_MS;
    const readyAt = spreadAt + SPREAD_MS + Math.ceil(mid) * SPREAD_STAGGER;
    const t = [
      setTimeout(() => setPhase("spread"), spreadAt),
      setTimeout(() => setReady(true), readyAt),
    ];
    return () => t.forEach(clearTimeout);
  }, [mid]);

  // Hover motion: one spring for the lift, one for the flip, per card. They
  // write straight to the DOM (no re-render per frame) and sleep when settled.
  useEffect(() => {
    const lift = new Array<number>(n).fill(0);
    const liftV = new Array<number>(n).fill(0);
    const flip = new Array<number>(n).fill(0);
    const flipV = new Array<number>(n).fill(0);
    let raf = 0;
    let last = 0;

    const apply = (i: number) => {
      const l = liftEls.current[i];
      const f = flipEls.current[i];
      const info = infoEls.current[i];
      const slot = slotEls.current[i];
      if (l) l.style.transform = `translateY(${-LIFT * lift[i]}%) scale(${1 + LIFT_SCALE * lift[i]})`;
      if (f) f.style.transform = `perspective(1000px) rotateY(${180 * flip[i]}deg)`;
      if (info) {
        // details fade in over the last part of the flip
        const o = Math.min(1, Math.max(0, (flip[i] - 0.55) / 0.45));
        info.style.opacity = String(o);
        info.style.transform = `translateY(${(1 - o) * 8}px)`;
      }
      if (slot) {
        // The hovered card is on top. The card you just left stays above its
        // neighbours until it has settled, so the hand-off never pops.
        const settling = lift[i] > 0.01 || flip[i] > 0.01;
        slot.style.zIndex = String(
          hoveredRef.current === i ? n + 20 : settling ? n + 10 : n - deck[i].rank
        );
      }
    };

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      let moving = false;

      for (let i = 0; i < n; i++) {
        const target = hoveredRef.current === i ? 1 : 0;

        if (reduced) {
          lift[i] = flip[i] = target;
          liftV[i] = flipV[i] = 0;
        } else {
          [lift[i], liftV[i]] = spring(lift[i], liftV[i], target, LIFT_RESPONSE, dt);
          [flip[i], flipV[i]] = spring(flip[i], flipV[i], target, FLIP_RESPONSE, dt);

          if (Math.abs(lift[i] - target) < 0.0005 && Math.abs(liftV[i]) < 0.001) {
            lift[i] = target;
            liftV[i] = 0;
          } else moving = true;

          if (Math.abs(flip[i] - target) < 0.0005 && Math.abs(flipV[i]) < 0.001) {
            flip[i] = target;
            flipV[i] = 0;
          } else moving = true;
        }
        apply(i);
      }
      raf = moving ? requestAnimationFrame(step) : 0;
    };

    kick.current = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(step);
    };

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
  }, [deck, n, reduced]);

  const openCard = (c: DeckCard) => {
    if (c.kind === "video" && c.video) setVideo(c.video);
    else if (c.href) router.push(c.href);
  };

  const onPointerOver = (e: React.PointerEvent) => {
    pointerType.current = e.pointerType;
    if (!ready || e.pointerType === "touch") return;
    setHover(hitIndex(e.target));
  };

  const onPointerLeave = () => {
    if (pointerType.current !== "touch") setHover(null);
  };

  const onClick = (e: React.MouseEvent) => {
    if (!ready || (e.target as HTMLElement).closest("button")) return;
    const i = hitIndex(e.target);
    if (i === null) {
      setHover(null);
      return;
    }
    // On touch, the first tap flips the card and the second opens it
    if (pointerType.current === "touch" && hoveredRef.current !== i) {
      setHover(i);
      return;
    }
    openCard(deck[i].card);
  };

  return (
    <section className="relative w-full overflow-hidden py-16 text-center">
      <style>{`
        @keyframes cardhero-float {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(0, calc(var(--h) * -0.028), 0) rotate(var(--fr, 0.5deg)); }
        }
        @keyframes cardhero-glow {
          0%, 100% { opacity: 0.14; transform: scaleX(1); }
          50% { opacity: 0.07; transform: scaleX(0.85); }
        }
      `}</style>
      <div className="mx-auto max-w-3xl px-4">
        <p className="mb-4 text-sm uppercase tracking-[0.45em] text-foreground/35">
          jackson zhou
        </p>
        <h1 className="text-[clamp(3rem,9vw,7rem)] font-bold leading-[0.9] tracking-tight">
          pick a card.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-foreground/50">
          hover to flip, click to open. ♠ photos, ♥ videos.
        </p>
      </div>

      {/* container: the row sizes itself from this element's width */}
      <div
        onPointerDown={(e) => (pointerType.current = e.pointerType)}
        onPointerOver={onPointerOver}
        onPointerLeave={onPointerLeave}
        onClick={onClick}
        className="mx-auto mt-6 w-full"
        style={{ containerType: "inline-size" }}
      >
        <div
          className="relative"
          style={
            {
              "--w": "clamp(120px, min(22.5cqw, 37vh), 360px)",
              "--h": "calc(var(--w) * 1.4)",
              // cards sit side by side when there is room, and overlap when there isn't
              "--step":
                n > 1
                  ? `min(calc(var(--w) * 1.06), calc((100cqw - var(--w) - 56px) / ${n - 1}))`
                  : "0px",
              paddingTop: "calc(var(--h) * 0.12)",
              paddingBottom: `calc(var(--h) * ${(mid * mid * DROP + 0.22).toFixed(3)})`,
            } as React.CSSProperties
          }
        >
          <div
            className="relative isolate mx-auto"
            style={{ width: "var(--w)", height: "var(--h)" }}
          >
            {/* visuals: never touched by the pointer */}
            <div className="pointer-events-none absolute inset-0">
              {deck.map(({ card: c, rank }, i) => {
                const isHover = hovered === i;
                const dim = hovered !== null && !isHover;
                const isTop = i === topSlot;
                const dist = Math.abs(i - mid);
                const isVideo = c.kind === "video";
                const floating = ready && !reduced;
                const floatDur = 5 + ((i * 7) % 5) * 0.5; // each card bobs at its own pace
                const floatDelay = i * 0.4;
                const floatTilt = i % 2 ? 0.5 : -0.5;

                return (
                  <div
                    key={i}
                    ref={(el) => {
                      slotEls.current[i] = el;
                    }}
                    className="absolute inset-0"
                    style={{
                      // newest on top, so the middle card is never covered
                      zIndex: n - rank,
                      transform: phase === "stack" ? stackTransform(i, isTop) : rowTransform(i),
                      transition: reduced
                        ? "none"
                        : `transform ${SPREAD_MS}ms cubic-bezier(0.2,0.9,0.25,1) ${Math.round(dist * SPREAD_STAGGER)}ms`,
                    }}
                  >
                    {/* soft light under the card; it shrinks as the card rises */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute left-[8%] right-[8%] rounded-full bg-white blur-2xl"
                      style={{
                        bottom: "-9%",
                        height: "7%",
                        opacity: 0.12,
                        animation: floating
                          ? `cardhero-glow ${floatDur}s ease-in-out ${floatDelay}s infinite`
                          : "none",
                      }}
                    />

                    {/* idle float: a slow bob and tilt, paused while hovered */}
                    <div
                      className="relative h-full w-full"
                      style={
                        {
                          "--fr": `${floatTilt}deg`,
                          animation: floating
                            ? `cardhero-float ${floatDur}s ease-in-out ${floatDelay}s infinite`
                            : "none",
                          animationPlayState: isHover ? "paused" : "running",
                        } as React.CSSProperties
                      }
                    >
                    {/* lift: driven by a spring (see the effect above) */}
                    <div
                      ref={(el) => {
                        liftEls.current[i] = el;
                      }}
                      className="relative h-full w-full will-change-transform"
                    >
                      {/* flip: also a spring */}
                      <div
                        ref={(el) => {
                          flipEls.current[i] = el;
                        }}
                        className="h-full w-full"
                        style={{
                          transformStyle: "preserve-3d",
                          transform: "perspective(1000px) rotateY(0deg)",
                        }}
                      >
                        {/* card back: black, name on an oval, your signature in the middle */}
                        <div
                          className="absolute inset-0 rounded-[14px] p-[2px] shadow-[0_14px_34px_rgba(0,0,0,0.45)]"
                          style={{
                            background: PAPER,
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                          }}
                        >
                          <CardBack animate={isTop && !reduced} dim={dim} />
                        </div>

                        {/* card face */}
                        <div
                          className={`absolute inset-0 rounded-[14px] p-[6px] ${
                            isHover
                              ? "shadow-[0_24px_56px_rgba(0,0,0,0.55)]"
                              : "shadow-[0_14px_34px_rgba(0,0,0,0.45)]"
                          } transition-shadow duration-500`}
                          style={{
                            background: PAPER,
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                            transform: "rotateY(180deg)",
                          }}
                        >
                          <div className="relative h-full w-full overflow-hidden rounded-[9px] bg-neutral-800">
                            <Image
                              src={c.image}
                              alt={c.title}
                              fill
                              sizes="(max-width: 640px) 35vw, 360px"
                              draggable={false}
                              className="object-cover"
                            />

                            {/* corner index, top left and mirrored bottom right like a real card */}
                            {[false, true].map((mirrored) => (
                              <div
                                key={String(mirrored)}
                                className={`absolute flex flex-col items-center rounded-md px-1.5 py-1 leading-none ${
                                  mirrored ? "bottom-1.5 right-1.5 rotate-180" : "left-1.5 top-1.5"
                                }`}
                                style={{
                                  background: PAPER,
                                  color: isVideo ? "#c1121f" : "#111",
                                  fontSize: "max(10px, calc(var(--w) * 0.075))",
                                }}
                              >
                                <span className="font-bold">{RANKS[rank]}</span>
                                <span>{isVideo ? "♥" : "♠"}</span>
                              </div>
                            ))}

                            {/* details: faded in by the flip spring */}
                            <div
                              ref={(el) => {
                                infoEls.current[i] = el;
                              }}
                              className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 pr-12 pt-10 text-left text-white"
                              style={{ opacity: 0, transform: "translateY(8px)" }}
                            >
                              <p
                                className="font-semibold leading-tight"
                                style={{ fontSize: "max(11px, calc(var(--w) * 0.085))" }}
                              >
                                {c.title}
                              </p>
                              <p
                                className="mt-0.5 text-white/70"
                                style={{ fontSize: "max(9px, calc(var(--w) * 0.062))" }}
                              >
                                {c.subtitle}
                              </p>
                              <span className="mt-2 inline-block rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-black">
                                {isVideo ? "▶ play" : "view album →"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* keyboard access: Tab to a card, Enter to open */}
                      <button
                        type="button"
                        aria-label={`${isVideo ? "Play video" : "Open album"}: ${c.title}`}
                        onFocus={() => ready && setHover(i)}
                        onBlur={() => setHover(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          openCard(c);
                        }}
                        className="pointer-events-none absolute inset-0 rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-white"
                      />
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Invisible hit layer. It stays in the finished row while the visuals
                above lift and flip (a card turning edge-on would otherwise lose
                the pointer and flicker), so the card under the pointer is always
                the one you can see. */}
            <div className="pointer-events-none absolute inset-0" style={{ zIndex: 100 }}>
              {deck.map(({ rank }, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute inset-0"
                  style={{ zIndex: n - rank, transform: rowTransform(i) }}
                >
                  <div
                    data-hit={i}
                    className="absolute inset-0 cursor-pointer"
                    style={{ pointerEvents: ready ? "auto" : "none" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 text-sm text-foreground/50">
        <Link href="/photos" className="transition-colors hover:text-foreground">
          ♠ all photos →
        </Link>
        <Link href="/videos" className="transition-colors hover:text-foreground">
          ♥ all videos →
        </Link>
      </div>

      {video && <VideoModal video={video} onClose={() => setVideo(null)} />}
    </section>
  );
}