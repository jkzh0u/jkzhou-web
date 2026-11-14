"use client";

import { useEffect, useState } from "react";

// Live numbers from opento.jkzhou.ca, shown on the opento project card. It sits under the
// card's stretched link, so the whole thing opens the project page like any other card.

const ENDPOINT = "https://opento.jkzhou.ca/api/widget";
const POLL_MS = 60_000;

type Section = {
  id: "police" | "fire" | "ttc" | "go";
  title: string;
  value: string | null;
  label: string;
  latest: { headline: string; time: string } | null;
};

type Summary = { updatedAt: string; sections: Section[] };

// The same section colours as opento
const accent: Record<Section["id"], string> = {
  police: "#1f3a68",
  fire: "#b3420d",
  ttc: "#b71c1c",
  go: "#0a6b35",
};

function ago(iso: string, now: number) {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} hr ago` : `${Math.floor(hours / 24)} d ago`;
}

export default function OpentoWidget() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(ENDPOINT);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: Summary = await response.json();
        if (cancelled) return;
        setSummary(data);
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
      if (!cancelled) setNow(Date.now());
    }

    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!summary) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
        {failed ? "opento is offline right now" : "loading live data..."}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col px-4 py-4 sm:px-6 sm:py-5" aria-label="live numbers from opento">
      <div className="flex items-center justify-between text-[10px] font-medium tracking-wide text-neutral-400 uppercase">
        <span className="flex items-center gap-1.5">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75 motion-reduce:hidden" />
            <span className="relative inline-flex size-1.5 rounded-full bg-red-500" />
          </span>
          live in toronto
        </span>
        <span>{failed ? "reconnecting" : `updated ${ago(summary.updatedAt, now)}`}</span>
      </div>

      <ul className="mt-3 grid min-h-0 flex-1 grid-cols-2 gap-2 sm:gap-3">
        {summary.sections.map((section) => (
          <li
            key={section.id}
            className="flex min-w-0 flex-col border-t-2 bg-white px-3 py-2 sm:px-4 sm:py-3"
            style={{ borderTopColor: accent[section.id] }}
          >
            <span className="text-[10px] font-medium tracking-wide uppercase" style={{ color: accent[section.id] }}>
              {section.title}
            </span>
            <span className="mt-0.5 text-2xl leading-tight font-semibold tabular-nums text-neutral-900 sm:text-3xl">
              {section.value ?? "–"}
            </span>
            <span className="text-xs text-neutral-500">{section.label}</span>
            {section.latest && (
              <span className="mt-auto hidden truncate pt-1 text-xs text-neutral-400 sm:block">
                {section.latest.headline}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
