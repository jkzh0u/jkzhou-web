"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type FadeInSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export default function FadeInSection({
  children,
  className = "",
  delay = 0,
}: FadeInSectionProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [signatureDone, setSignatureDone] = useState(false);

  useEffect(() => {
    const onComplete = () => {
      setSignatureDone(true);
    };

    window.addEventListener("signature-complete", onComplete);

    return () => {
      window.removeEventListener("signature-complete", onComplete);
    };
  }, []);

  useEffect(() => {
    if (!signatureDone) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          requestAnimationFrame(() => {
            setVisible(true);
          });

          observer.unobserve(el);
        }
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [signatureDone]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(24px)",

        transitionProperty: "opacity, transform",
        transitionDuration: "1400ms",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        transitionDelay: `${delay}ms`,

        willChange: visible ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}