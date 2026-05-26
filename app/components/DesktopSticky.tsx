"use client";

import { useEffect, useRef, type ReactNode } from "react";

type DesktopStickyProps = {
  children: ReactNode;
  scrollBuffer?: number;
};

export default function DesktopSticky({
  children,
  scrollBuffer = 420,
}: DesktopStickyProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);

      frameRef.current = requestAnimationFrame(() => {
        const section = sectionRef.current;
        const inner = innerRef.current;

        if (!section || !inner) return;

        const rect = section.getBoundingClientRect();
        const scrolled = Math.max(0, -rect.top);

        const holdDistance = scrollBuffer * 0.62;
        const moveRange = scrollBuffer - holdDistance;

        const raw =
          moveRange > 0
            ? Math.min(Math.max((scrolled - holdDistance) / moveRange, 0), 1)
            : 0;

        // softer/slower start
        const eased = raw * raw * raw;

        const dropAmount = 75;

        inner.style.transform = `translate3d(0, ${eased * dropAmount}px, 0)`;
      });
    };

    update();

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);

      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [scrollBuffer]);

  return (
    <div
      ref={sectionRef}
      className="block relative"
      style={{
        height: `calc(100vh - 56px + ${scrollBuffer}px)`,
        marginBottom: "-70px",
      }}
    >
<div
  className="sticky top-[56px] flex items-start"
  style={{
    minHeight: "calc(100vh - 56px)",
  }}
>
        <div
          ref={innerRef}
          className="w-full"
          style={{
            transform: "translate3d(0,0,0)",
            willChange: "transform",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}