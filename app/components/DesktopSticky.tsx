"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const NAV_HEIGHT = 56;
const SCROLL_BUFFER = 1600;
const RELEASE_DISTANCE = 850;

type DesktopStickyProps = {
  children: ReactNode;
};

export default function DesktopSticky({ children }: DesktopStickyProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [release, setRelease] = useState(0);

  useEffect(() => {
    const update = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const rect = wrapper.getBoundingClientRect();
      const releaseStart = -(SCROLL_BUFFER - RELEASE_DISTANCE);

      const raw = (releaseStart - rect.top) / RELEASE_DISTANCE;
      const clamped = Math.min(1, Math.max(0, raw));

      const eased = clamped * clamped * (3 - 2 * clamped);

      setRelease(eased);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{
        height: `calc(100vh - ${NAV_HEIGHT}px + ${SCROLL_BUFFER}px)`,
      }}
    >
      <div
        className="sticky"
        style={{
          top: `${NAV_HEIGHT}px`,
          height: `calc(100vh - ${NAV_HEIGHT}px)`,
        }}
      >
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            transform: `translateY(${-release * 42}px)`,
            transition: "transform 90ms linear",
            willChange: "transform",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}