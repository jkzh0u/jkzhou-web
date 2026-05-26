"use client";

import { useEffect, useRef, useState } from "react";
import FadeInSection from "./FadeInSection";

export default function HeroText() {
  const [progress1, setProgress1] = useState(0.28);
  const [progress2, setProgress2] = useState(0);

  const target1 = useRef<number>(0.28);
  const target2 = useRef<number>(0);
  const raf = useRef<number>(0);

  const MAX_EM = 2.2;

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      const mobile = window.innerWidth < 1280;

      target1.current = mobile
        ? Math.min(1, Math.max(0.28, y / 55))
        : Math.min(1, Math.max(0, (y - 10) / 120));

      target2.current = mobile
        ? Math.min(1, Math.max(0, (y - 10) / 55))
        : Math.min(1, Math.max(0, (y - 80) / 120));
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      setProgress1(prev => {
        const next = lerp(prev, target1.current, 0.08);
        return Math.abs(next - target1.current) < 0.001
          ? target1.current
          : next;
      });

      setProgress2(prev => {
        const next = lerp(prev, target2.current, 0.08);
        return Math.abs(next - target2.current) < 0.001
          ? target2.current
          : next;
      });

      raf.current = requestAnimationFrame(tick);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes wave {
          0% { transform: rotate(0deg); }
          15% { transform: rotate(14deg); }
          30% { transform: rotate(-8deg); }
          40% { transform: rotate(14deg); }
          50% { transform: rotate(-4deg); }
          60% { transform: rotate(10deg); }
          70% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>

      {/* MOBILE VERSION */}
      <div className="xl:hidden text-center font-bold text-5xl sm:text-6xl md:text-7xl leading-[1.02]">
        <FadeInSection delay={500}>
          <p>
            hello!{" "}
            <span
              className="inline-block text-[1.3em] align-[-0.08em]"
              style={{
                animation: "wave 2s ease-in-out infinite",
                transformOrigin: "70% 70%",
              }}
            >
              👋
            </span>
          </p>
        </FadeInSection>

        <FadeInSection delay={700}>
          <p>
            i'm a{" "}
            <span
              className="inline-block overflow-hidden align-middle rounded-lg"
              style={{
                width: progress1 > 0.02 ? `${progress1 * 2.05}em` : "0em",
                opacity: progress1,
                marginInline: progress1 > 0.02 ? "0.04em" : "-0.04em",
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1434394354979-a235cd36269d?"
                alt=""
                className="h-[0.9em] w-[2.05em] object-cover"
              />
            </span>{" "}
            photographer
          </p>
        </FadeInSection>

        <FadeInSection delay={900}>
          <p>
            and{" "}
            <span
              className="inline-block overflow-hidden align-middle rounded-lg"
              style={{
                width: progress2 > 0.02 ? `${progress2 * 2.05}em` : "0em",
                opacity: progress2,
                marginInline: progress2 > 0.02 ? "0.04em" : "-0.04em",
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1434394354979-a235cd36269d?"
                alt=""
                className="h-[0.9em] w-[2.05em] object-cover"
              />
            </span>{" "}
            filmmaker
          </p>
        </FadeInSection>

        <FadeInSection delay={1100}>
          <p className="mt-6 text-base md:text-lg font-normal leading-relaxed text-neutral-600 dark:text-neutral-300">
            and welcome to my website! it is still in development, so many
            features and text are not implemented. i hope you enjoy my work!
          </p>
        </FadeInSection>
      </div>

      {/* DESKTOP VERSION */}
      <div className="hidden xl:block text-5xl font-bold" style={{ lineHeight: "1.4" }}>
        <FadeInSection delay={500}>
          <p>
            hello!{" "}
            <span
              style={{
                display: "inline-block",
                animation: "wave 2s ease-in-out infinite",
                transformOrigin: "70% 70%",
              }}
            >
              👋
            </span>{" "}
            i'm a
          </p>
        </FadeInSection>

        <FadeInSection delay={700}>
          <p>photographer</p>
        </FadeInSection>

        <FadeInSection delay={700}>
          <div
            style={{
              height: `${progress1 * MAX_EM}em`,
              overflow: "hidden",
              opacity: progress1,
              borderRadius: "0.6rem",
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1434394354979-a235cd36269d?"
              alt="photographer"
              className="w-full object-cover"
              style={{ height: `${MAX_EM}em` }}
            />
          </div>
        </FadeInSection>

        <FadeInSection delay={900}>
          <p>and filmmaker</p>
        </FadeInSection>

        <FadeInSection delay={900}>
          <div
            style={{
              height: `${progress2 * MAX_EM}em`,
              overflow: "hidden",
              opacity: progress2,
              borderRadius: "0.6rem",
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1434394354979-a235cd36269d?"
              alt="filmmaker"
              className="w-full object-cover"
              style={{ height: `${MAX_EM}em` }}
            />
          </div>
        </FadeInSection>

        <FadeInSection delay={1100}>
          <p className="mt-5 text-base font-normal text-neutral-600 dark:text-neutral-300">
            and welcome to my website! it is still in development, so many
            features and text are not implemented. i hope you enjoy my work!
          </p>
        </FadeInSection>
      </div>
    </>
  );
}