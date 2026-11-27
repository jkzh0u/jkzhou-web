'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { getScrollY } from './SmoothScroll';
import { isLiteMode } from './perfMode';

export type Interest = { label: string; src: string; description: string };

// Where each polaroid sits on the wall, repeating if there are more interests than spots.
// x: 0 is the left edge of the wall, 1 the right. side: which side its note goes on.
// tilt: resting angle in degrees.
const SPOTS = [
    { x: 0.04, side: 'right', tilt: -4 },
    { x: 0.94, side: 'left', tilt: 3 },
    { x: 0.3, side: 'left', tilt: -2 },
    { x: 0.9, side: 'left', tilt: 4.5 },
    { x: 0.06, side: 'right', tilt: -3 },
    { x: 0.7, side: 'right', tilt: 2.5 },
] as const;
// Vertical distance between polaroids, in polaroid widths.
const STEP = 0.9;
// Height of a polaroid in polaroid widths, used to size the wall.
const CARD_HEIGHT = 1.5;
// A polaroid reveals once its top is this far down the screen (fraction of screen height).
// The reveal is the site's own photo reveal (media-reveal in globals.css): it fades in,
// comes into focus and settles from slightly smaller. It plays once.
const REVEAL_LINE = 0.8;

// The scroll cylinder from HomeHero and AboutMe: the polaroids sit on a cylinder that curves
// away above and below the middle of the screen, and curves harder the faster you scroll.
// Same numbers as HomeHero's CONFIG. MAX_BEND caps it, because a polaroid bends as one flat
// piece (the hero bends each photo's surface in WebGL), so a full bend tips it too far.
const BASE_BEND = 0.18;
const VELOCITY_BEND = 0.8;
const MAX_BEND = 0.6;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;


export default function Interests({ interests }: { interests: Interest[] }) {
    const wallRef = useRef<HTMLDivElement>(null);

    // One frame loop for the reveal and the scroll cylinder. Positions come from offsetTop,
    // which ignores transforms, so the bend never feeds back into its own measurements.
    useEffect(() => {
        const wall = wallRef.current;
        if (!wall) return;

        const items = Array.from(wall.querySelectorAll<HTMLElement>('.pw-item')).map((el) => ({
            el,
            top: 0,
            centre: 0,
        }));

        // everything shown and flat, no motion
        const settle = () => {
            for (const item of items) {
                item.el.classList.add('is-in');
                item.el.style.transform = '';
            }
        };

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            settle();
            return;
        }

        let lastScrollY = getScrollY();
        let smoothedVelocity = 0;
        let bend = BASE_BEND;
        let drawnScroll = NaN;
        let drawnBend = NaN;
        let dirty = true;
        let settled = false;

        const measure = () => {
            for (const item of items) {
                item.top = item.el.offsetTop;
                item.centre = item.top + item.el.offsetHeight / 2;
            }
            dirty = true;
        };

        const tick = () => {
            if (isLiteMode()) {
                // too slow for this: drop everything into place once, then stop
                if (!settled) {
                    settle();
                    settled = true;
                }
                return;
            }
            if (settled) {
                settled = false;
                dirty = true;
            }

            const scrollY = getScrollY();
            const frameDelta = Math.min(Math.abs(scrollY - lastScrollY), 60);
            lastScrollY = scrollY;

            smoothedVelocity +=
                (frameDelta - smoothedVelocity) * (frameDelta > smoothedVelocity ? 0.22 : 0.1);
            const targetBend = clamp(
                BASE_BEND + clamp(smoothedVelocity / 40, 0, 1) * VELOCITY_BEND,
                0,
                1
            );
            bend += (targetBend - bend) * (targetBend < bend ? 0.12 : 0.1);

            const vh = window.innerHeight;
            const box = wall.getBoundingClientRect();
            if (box.bottom < -vh * 0.5 || box.top > vh * 1.5) return;
            if (!dirty && scrollY === drawnScroll && Math.abs(bend - drawnBend) < 0.0005) return;
            dirty = false;
            drawnScroll = scrollY;
            drawnBend = bend;

            // the wall's top in the smooth-scrolled frame, as AboutMe does it
            const wallTop = box.top + window.scrollY - scrollY;
            const radius = vh * 1.1;
            const k = Math.min(bend, MAX_BEND);

            for (const item of items) {
                if (!item.el.classList.contains('is-in') && wallTop + item.top < vh * REVEAL_LINE) {
                    item.el.classList.add('is-in');
                }

                const yv = wallTop + item.centre - vh / 2;
                if (Math.abs(yv) > vh * 1.3) continue;
                const a = clamp(yv / radius, -1.3, 1.3);
                const shiftY = lerp(yv, radius * Math.sin(a), k) - yv;
                const shiftZ = radius * (Math.cos(a) - 1) * k;
                item.el.style.transform = `perspective(1000px) translate3d(0, ${shiftY}px, ${shiftZ}px) rotateX(${-a * k}rad)`;
            }
        };

        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(wall);
        window.addEventListener('resize', measure);
        gsap.ticker.add(tick);

        return () => {
            ro.disconnect();
            window.removeEventListener('resize', measure);
            gsap.ticker.remove(tick);
            settle();
        };
    }, [interests.length]);

    if (interests.length === 0) return null;

    const lastY = (interests.length - 1) * STEP;

    return (
        <section className="pw-root" aria-labelledby="interests-label">
            <style>{css}</style>

            <h2 id="interests-label" className="pw-label">
                interests
            </h2>

            <div
                ref={wallRef}
                className="pw-wall"
                style={{ '--pw-h': lastY + CARD_HEIGHT } as React.CSSProperties}
            >
                {interests.map((interest, i) => {
                    const spot = SPOTS[i % SPOTS.length];
                    return (
                        <article
                            key={interest.src + i}
                            className={`pw-item pw-item--${spot.side} pw-item--${i % 2 ? 'odd' : 'even'}`}
                            style={
                                {
                                    '--x': spot.x,
                                    '--y': i * STEP,
                                    '--tilt': `${spot.tilt}deg`,
                                } as React.CSSProperties
                            }
                        >
                            <div className="pw-card">
                                <div className="pw-polaroid">
                                    <span className="pw-photo">
                                        <Image
                                            src={interest.src}
                                            alt={interest.label}
                                            fill
                                            sizes="(max-width: 960px) 60vw, 270px"
                                            draggable={false}
                                        />
                                    </span>
                                    <h3 className="pw-name">{interest.label}</h3>
                                </div>
                            </div>
                            <div className="pw-note">
                                <p className="pw-note-text">{interest.description}</p>
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

const css = `
  .pw-root {
    --pw-ink: #33333d;
    --pw-accent: #c8292a;
    position: relative;
    z-index: 2;
    padding: 12vh clamp(16px, 4vw, 64px) 14vh;
    background: var(--background, #fff);
    color: var(--pw-ink);
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  }

  .pw-label {
    margin: 0 0 clamp(48px, 7vw, 96px);
    font-size: clamp(28px, 3vw, 44px);
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.025em;
    text-align: center;
  }

  .pw-wall {
    --pw-w: clamp(190px, 21vw, 270px);
    --note-w: 220px;
    position: relative;
    max-width: 1120px;
    height: calc(var(--pw-h) * var(--pw-w));
    margin: 0 auto;
  }

  .pw-item {
    position: absolute;
    top: calc(var(--y) * var(--pw-w));
    left: calc(var(--x) * (100% - var(--pw-w)));
    width: var(--pw-w);
  }

  /* hidden until revealed, then the site's photo reveal (globals.css media-reveal) */
  .pw-card {
    position: relative;
    z-index: 1;
    rotate: var(--tilt);
    opacity: 0;
  }

  .pw-item.is-in .pw-card {
    opacity: 1;
    animation: media-reveal 1.2s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  }

  /* too slow for an animated blur (perfMode.ts): plain fade */
  html.perf-lite .pw-item.is-in .pw-card {
    animation: pw-fade 0.8s ease backwards;
  }

  @keyframes pw-fade {
    from { opacity: 0; }
  }

  .pw-polaroid {
    padding: 11px 11px 0;
    background: #fff;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.08),
      0 14px 30px -18px rgba(0, 0, 0, 0.35);
    transition: translate 0.5s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.5s ease;
  }

  @media (hover: hover) {
    .pw-item.is-in .pw-polaroid:hover {
      translate: 0 -4px;
      box-shadow:
        0 2px 4px rgba(0, 0, 0, 0.08),
        0 26px 44px -22px rgba(0, 0, 0, 0.4);
    }
  }

  .pw-photo {
    position: relative;
    display: block;
    aspect-ratio: 4 / 5;
    overflow: hidden;
    background: #ececef;
  }

  .pw-photo img {
    object-fit: cover;
    -webkit-user-drag: none;
  }

  .pw-name {
    margin: 0;
    padding: 14px 4px 18px;
    font-size: clamp(17px, 1.5vw, 21px);
    font-weight: 600;
    line-height: 1.1;
    letter-spacing: -0.015em;
    text-align: center;
  }

  .pw-note {
    position: absolute;
    top: calc(var(--pw-w) * 0.78);
    width: var(--note-w);
    opacity: 0;
    translate: 0 12px;
    transition: opacity 0.6s ease, translate 0.8s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .pw-item--right .pw-note {
    left: calc(100% + 28px);
  }

  .pw-item--left .pw-note {
    right: calc(100% + 28px);
    text-align: right;
  }

  .pw-item.is-in .pw-note {
    opacity: 1;
    translate: 0 0;
    /* as the polaroid comes into focus */
    transition-delay: 0.35s;
  }


  .pw-note-text {
    margin: 0;
    font-size: clamp(15px, 1.2vw, 17px);
    line-height: 1.45;
    color: color-mix(in srgb, currentColor 68%, transparent);
  }

  /* narrow screens: one column, the polaroids alternate sides with their notes underneath */
  @media (max-width: 960px) {
    .pw-wall {
      --pw-w: min(60vw, 260px);
      height: auto;
      display: flex;
      flex-direction: column;
      gap: 56px;
    }

    .pw-item {
      position: relative;
      top: auto;
      left: auto;
    }

    .pw-item--even {
      align-self: flex-start;
      margin-left: 2%;
    }

    .pw-item--odd {
      align-self: flex-end;
      margin-right: 2%;
    }


    .pw-item .pw-note {
      position: relative;
      z-index: 1;
      top: auto;
      left: auto;
      right: auto;
      width: min(80vw, 320px);
      margin-top: 22px;
      text-align: left;
    }

    .pw-item--odd .pw-note {
      margin-left: calc(var(--pw-w) - min(80vw, 320px));
      text-align: right;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pw-item.is-in .pw-card {
      animation: none;
    }
    .pw-note {
      transition: none;
    }
  }
`;
