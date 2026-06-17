"use client";

import { useEffect, useRef } from "react";

const STROKES = [
  { id: "jMain", d: "M89.0012 56.5C107.501 124.333 136.701 260.5 105.501 268.5C66.5012 278.5 31.0012 249 12.0012 221", delay: 0, dur: 500 },
  { id: "jDot", d: "M76.5012 12V13", delay: 320, dur: 160 },
  { id: "kVert", d: "M170.001 41.5V235.5", delay: 550, dur: 550 },
  { id: "kArm", d: "M248.001 93.5L170.001 171", delay: 920, dur: 380 },
  { id: "kLeg", d: "M170.001 171C180.334 169 206.401 166.9 228.001 174.5C255.001 184 264.501 190.5 273.501 209.5", delay: 1180, dur: 420 },
  { id: "z", d: "M302.001 93.5C309.168 87.6667 327.301 74.8 342.501 70C361.501 64 397.001 50 380.501 82.5C367.301 108.5 326.001 180.667 307.001 213.5C292.001 234.167 277.701 267.2 340.501 234C403.301 200.8 425.001 195 425.001 195", delay: 1480, dur: 750 },
];

const TOTAL_DRAW_MS = 1480 + 750;
const HOLD_MS = 350;
const BLUR_MS = 900;

export default function SignatureOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const blurFeRef = useRef<SVGFEGaussianBlurElement>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    const group = groupRef.current;
    const blurFe = blurFeRef.current;

    if (!overlay || !group || !blurFe) return;

    // lock scroll
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const timers: ReturnType<typeof setTimeout>[] = [];

    STROKES.forEach((s) => {
      const path = group.querySelector<SVGPathElement>(`[data-id="${s.id}"]`);
      if (!path) return;

      timers.push(
        setTimeout(() => {
          path.style.transition = `stroke-dashoffset ${s.dur}ms cubic-bezier(0.65,0,0.35,1)`;
          path.style.strokeDashoffset = "0";
        }, s.delay)
      );
    });

    timers.push(
      setTimeout(() => {
        blurFe.animate(
          [{ stdDeviation: "0" }, { stdDeviation: "16" }] as unknown as Keyframe[],
          {
            duration: BLUR_MS,
            easing: "cubic-bezier(0.4,0,0.2,1)",
            fill: "forwards",
          }
        );

        group.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          {
            duration: BLUR_MS,
            easing: "cubic-bezier(0.4,0,0.2,1)",
            fill: "forwards",
          }
        );

        overlay.style.transition = `opacity ${BLUR_MS}ms ease`;
        overlay.style.opacity = "0";

        window.dispatchEvent(new Event("signature-complete"));

        timers.push(
          setTimeout(() => {
            overlay.style.display = "none";

            // unlock scroll
            document.documentElement.style.overflow = prevHtmlOverflow;
            document.body.style.overflow = prevBodyOverflow;

          }, BLUR_MS + 50)
        );
      }, TOTAL_DRAW_MS + HOLD_MS)
    );

    return () => {
      timers.forEach(clearTimeout);

      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        background: "var(--background)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox="0 0 437 283"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          display: "block",

          // ~10% bigger + responsive
          width: "clamp(80px, 10vw, 155px)",

          height: "auto",
          overflow: "visible",
        }}
      >
        <defs>
          <filter id="sig-blur" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur ref={blurFeRef} stdDeviation="0" />
          </filter>
        </defs>

        <g ref={groupRef} style={{ filter: "url(#sig-blur)" }}>
          {STROKES.map((s) => (
            <path
              key={s.id}
              data-id={s.id}
              d={s.d}
              stroke="var(--foreground)"
              strokeWidth={24}
              strokeLinecap="round"
              fill="none"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}