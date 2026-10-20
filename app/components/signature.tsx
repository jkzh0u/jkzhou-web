"use client";

import { useEffect, useState, type CSSProperties } from "react";

const STROKES = [
  { id: "jMain", d: "M89.0012 56.5C107.501 124.333 136.701 260.5 105.501 268.5C66.5012 278.5 31.0012 249 12.0012 221", delay: 0, dur: 500 },
  { id: "jDot", d: "M76.5012 12V13", delay: 320, dur: 160 },
  { id: "kVert", d: "M170.001 41.5V235.5", delay: 550, dur: 550 },
  { id: "kArm", d: "M248.001 93.5L170.001 171", delay: 920, dur: 380 },
  { id: "kLeg", d: "M170.001 171C180.334 169 206.401 166.9 228.001 174.5C255.001 184 264.501 190.5 273.501 209.5", delay: 1180, dur: 420 },
  { id: "z", d: "M302.001 93.5C309.168 87.6667 327.301 74.8 342.501 70C361.501 64 397.001 50 380.501 82.5C367.301 108.5 326.001 180.667 307.001 213.5C292.001 234.167 277.701 267.2 340.501 234C403.301 200.8 425.001 195 425.001 195", delay: 1480, dur: 750 },
];

// When the last stroke finishes drawing
export const SIGNATURE_DRAW_MS = 1480 + 750;

/**
 * The signature as an SVG. Colour comes from `currentColor`, so set it with a
 * text colour class. `animate` draws it stroke by stroke on mount; otherwise it
 * renders fully drawn.
 */
export default function Signature({
  animate = false,
  className,
  style,
}: {
  animate?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!animate) return;
    // two frames, so the browser paints the hidden state before transitioning
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setStarted(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [animate]);

  const drawn = !animate || started;

  return (
    <svg
      viewBox="0 0 437 283"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      style={{ display: "block", overflow: "visible", ...style }}
    >
      {STROKES.map((s) => (
        <path
          key={s.id}
          d={s.d}
          stroke="currentColor"
          strokeWidth={24}
          strokeLinecap="round"
          fill="none"
          pathLength={1}
          // "1 2" (not "1") so no stray round-cap dot shows before drawing
          strokeDasharray="1 2"
          style={{
            strokeDashoffset: drawn ? 0 : 1,
            transition: animate
              ? `stroke-dashoffset ${s.dur}ms cubic-bezier(0.65,0,0.35,1) ${s.delay}ms`
              : "none",
          }}
        />
      ))}
    </svg>
  );
}