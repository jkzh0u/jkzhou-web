"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type DesktopStickyProps = {
  children: ReactNode;
  strength?: number;
};

export default function DesktopSticky({
  children,
  strength = 0.6,
}: DesktopStickyProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const update = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const scrolled = Math.max(0, -rect.top);

      const vh = window.innerHeight;
      const vw = window.innerWidth;

      // disable on mobile + short screens
      const isMobile = vw < 1024;   // Tailwind lg breakpoint
      const isShort = vh < 850;

      if (isMobile || isShort) {
        setOffset(0);
        return;
      }

      // normal behavior for large screens
      const viewportBasedMax = Math.min(vh * 0.16, 220);
      const y = Math.min(scrolled * strength, viewportBasedMax);

      setOffset(y);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [strength]);

  return (
    <section
      ref={sectionRef}
      className="relative hidden lg:flex min-h-[calc(100vh-56px)] items-center"
    >
      <div
        className="w-full"
        style={{
          transform: `translateY(${offset}px)`,
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </section>
  );
}