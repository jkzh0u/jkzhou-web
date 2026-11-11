'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

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
// A polaroid drops in once its top passes this far down the screen (fraction of screen height).
const REVEAL_LINE = 0.62;

const pad = (i: number) => String(i + 1).padStart(2, '0');

export default function Interests({ interests }: { interests: Interest[] }) {
    const wallRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const wall = wallRef.current;
        if (!wall) return;
        const items = Array.from(wall.querySelectorAll<HTMLElement>('.pw-item'));

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            items.forEach((item) => item.classList.add('is-in'));
            return;
        }

        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    const passed = entry.isIntersecting || entry.boundingClientRect.top < 0;
                    entry.target.classList.toggle('is-in', passed);
                }
            },
            { rootMargin: `0px 0px -${Math.round((1 - REVEAL_LINE) * 100)}% 0px` }
        );
        items.forEach((item) => io.observe(item));
        return () => io.disconnect();
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
                                <p className="pw-note-no">no. {pad(i)}</p>
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
    font-family: "Neue Montreal", "Helvetica Neue", Helvetica, Arial, sans-serif;
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

  .pw-card {
    position: relative;
    z-index: 1;
    rotate: var(--tilt);
    transform-origin: 50% 0;
    opacity: 0;
    translate: 0 -26px;
    scale: 1.06;
    transition:
      opacity 0.5s ease,
      translate 0.7s cubic-bezier(0.34, 1.5, 0.64, 1),
      scale 0.7s cubic-bezier(0.34, 1.5, 0.64, 1);
  }

  .pw-item.is-in .pw-card {
    opacity: 1;
    translate: 0 0;
    scale: 1;
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
    transition-delay: 0.3s;
  }

  .pw-note-no {
    margin: 0 0 8px;
    font-family: var(--font-geist-mono), ui-monospace, monospace;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--pw-accent);
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
    .pw-card,
    .pw-note {
      transition: none;
    }
  }
`;
