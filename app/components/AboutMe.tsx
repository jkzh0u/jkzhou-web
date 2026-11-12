'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { getScrollY } from './SmoothScroll';
import { isLiteMode } from './perfMode';

const ABOUT_PARAGRAPHS = [
    "hi! I'm Jackson (周子冸), I am currently interested in medicine & systems design engineering",
    "I am also a photographer, filmmaker, and creator based in toronto!",
    "lately I've been documenting my life through videos and photos! all of this started in 2023 when I first picked up photography using my dad's old camera.",
];

const BASE_BEND = 0.18;
const VELOCITY_BEND = 0.8;
const TEXT_MAX_BEND = 0.3;

const NAV_CLEARANCE = 56;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function AboutMe({ portrait }: { portrait: string }) {
    const trackRef = useRef<HTMLElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const photoRef = useRef<HTMLDivElement>(null);
    const introRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const track = trackRef.current;
        const stage = stageRef.current;
        const content = contentRef.current;
        const photo = photoRef.current;
        const intro = introRef.current;
        if (!track || !stage || !content || !photo || !intro) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const words = Array.from(intro.querySelectorAll<HTMLElement>('[data-word]')).map((el, idx) => ({
            el,
            idx,
            y: 0,
        }));

        let lift = 0;
        let cancelled = false;
        let dirty = true;
        let lastScrollY = getScrollY();
        let smoothedVelocity = 0;
        let bend = BASE_BEND;
        let drawnScroll = NaN;
        let drawnBend = NaN;

        const measure = () => {
            if (cancelled) return;
            const vh = window.innerHeight;
            track.classList.toggle('is-static', content.offsetHeight + NAV_CLEARANCE * 2 > vh);

            const stageTop = stage.getBoundingClientRect().top;
            let lowest = -Infinity;
            for (const w of words) {
                const r = (w.el.parentElement ?? w.el).getBoundingClientRect();
                w.y = r.top - stageTop + r.height / 2;
                lowest = Math.max(lowest, w.y - vh / 2 + w.idx * 2);
            }

            lift = Math.max(0, lowest - vh * 0.3);
            dirty = true;
        };

        const tick = () => {
            // lite mode: the words just sit in place (see the perf-lite CSS below)
            if (isLiteMode()) return;
            const scrollY = getScrollY();
            const box = stage.getBoundingClientRect();
            const stageTop = box.top + window.scrollY - scrollY;

            const frameDelta = Math.min(Math.abs(scrollY - lastScrollY), 60);
            lastScrollY = scrollY;

            const rawVelocity = reduceMotion ? 0 : frameDelta;
            smoothedVelocity +=
                (rawVelocity - smoothedVelocity) * (rawVelocity > smoothedVelocity ? 0.22 : 0.1);
            const targetBend = clamp(
                BASE_BEND + clamp(smoothedVelocity / 40, 0, 1) * VELOCITY_BEND,
                0,
                1
            );
            bend += (targetBend - bend) * (targetBend < bend ? 0.12 : 0.1);

            const vh = window.innerHeight;
            if (box.bottom < -vh * 0.5 || box.top > vh * 2) return;
            if (!dirty && scrollY === drawnScroll && Math.abs(bend - drawnBend) < 0.0005) return;
            dirty = false;
            drawnScroll = scrollY;
            drawnBend = bend;

            const radius = vh * 1.1;
            const k = clamp(bend * 1.1, 0, TEXT_MAX_BEND);

            for (const w of words) {
                const yv = stageTop + w.y - vh / 2;
                if (yv > vh * 1.2 || yv < -vh * 1.2) {
                    w.el.style.opacity = yv > 0 ? '0' : '1';
                    continue;
                }

                const reveal = clamp((vh * 0.75 - yv - w.idx * 2 + lift) / (vh * 0.45), 0, 1);
                w.el.style.opacity = String(reveal);

                if (reduceMotion) continue;
                const a = clamp(yv / radius, -1.3, 1.3);
                const shiftY = lerp(yv, radius * Math.sin(a), k) - yv;
                const shiftZ = radius * (Math.cos(a) - 1) * k;
                w.el.style.transform = `perspective(1000px) translate3d(0, ${shiftY + (1 - reveal) * 22}px, ${shiftZ}px) rotateX(${-a * k}rad)`;
            }
        };

        photo.querySelector('img')?.decode().catch(() => {});

        measure();
        document.fonts?.ready.then(measure);
        const ro = new ResizeObserver(measure);
        ro.observe(content);
        window.addEventListener('resize', measure);
        gsap.ticker.add(tick);

        return () => {
            cancelled = true;
            ro.disconnect();
            window.removeEventListener('resize', measure);
            gsap.ticker.remove(tick);
        };
    }, []);

    return (
        <section ref={trackRef} className="ab-track" data-about>
            <style>{css}</style>

            <div ref={stageRef} className="ab-stage" data-about-stage>
                <div ref={contentRef} className="ab-content">
                    <span className="ab-slot" data-about-slot>
                        <div ref={photoRef} className="ab-photo">
                            <Image
                                src={portrait}
                                alt="jackson zhou"
                                fill
                                sizes="(max-width: 1000px) 27vw, 260px"
                                draggable={false}
                            />
                        </div>
                    </span>

                    <div ref={introRef} className="ab-text">
                        {ABOUT_PARAGRAPHS.map((para, pi) => (
                            <p key={pi} className="ab-para">
                                {para.split(' ').map((word, wi) => (
                                    <span key={wi}>
                                        <span data-word className="ab-word">
                                            {word}
                                        </span>{' '}
                                    </span>
                                ))}
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

const css = `
  .ab-track {
    position: relative;
    z-index: 2;
    color: #33333d;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    overflow-anchor: none;
  }

  .ab-stage {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100svh;
    overflow: clip;
  }

  .ab-track.is-static .ab-stage {
    height: auto;
    padding: 80px 0;
  }

  .ab-content {
    --ab-photo-w: clamp(180px, calc(300px - 8vw), 260px);
    display: flex;
    flex-direction: column;
    align-items: center;
    width: min(980px, 48vw);
    text-align: center;
  }

  .ab-slot {
    position: relative;
    display: block;
    flex: none;
    width: var(--ab-photo-w);
    aspect-ratio: 4 / 5;
    margin-bottom: 40px;
  }

  .ab-photo {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  .ab-photo img {
    object-fit: cover;
    -webkit-user-drag: none;
  }

  .ab-text {
    width: 100%;
  }

  .ab-para {
    margin: 0 0 0.95em;
    font-size: clamp(22px, calc(32px - 1vw), 30px);
    line-height: 1.24;
    letter-spacing: -0.01em;
  }

  .ab-word {
    display: inline-block;
    will-change: transform, opacity;
  }

  html.perf-lite .ab-word {
    opacity: 1 !important;
    transform: none !important;
    will-change: auto;
  }

  @media (max-width: 1000px) {
    .ab-content {
      --ab-photo-w: 27vw;
      width: 88vw;
    }

    .ab-slot {
      margin-bottom: 32px;
    }

    .ab-para {
      font-size: clamp(20px, calc(28px - 2vw), 24px);
    }
  }
`;
