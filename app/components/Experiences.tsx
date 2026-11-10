'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { experiences, type Experience } from '@/data/experiences';

const REPEATS = 3;
// how often (ms) to check which logo is in the middle of the marquee
const CENTER_CHECK_MS = 100;
// seconds the marquee takes to drift through one group of logos
const LOOP_SECONDS = 90;
// px the pointer must move before a press counts as a drag, so taps still work
const DRAG_THRESHOLD = 4;
// fastest a release can throw the marquee, in px per second
const MAX_THROW = 2400;
// how quickly a throw settles back into the drift, higher is quicker
const SETTLE_RATE = 3;

function Logo({
    item,
    on,
    onShow,
}: {
    item: Experience;
    on: boolean;
    onShow: (touch: boolean) => void;
}) {
    return (
        <span
            className={`ex-item${on ? ' is-on' : ''}`}
            onPointerEnter={(e) => {
                if (e.pointerType === 'mouse') onShow(false);
            }}
            onPointerDown={(e) => {
                if (e.pointerType !== 'mouse') onShow(true);
            }}
        >
            <span className="ex-logo">
                <Image
                    src={item.logo}
                    alt=""
                    fill
                    sizes="(max-width: 760px) 180px, 280px"
                    loading="eager"
                    draggable={false}
                />
            </span>
        </span>
    );
}

// Every rendered logo has a "slot": its position in the track, counting across both groups and
// all repeats. slot % experiences.length is the experience it shows.
const experienceAt = (slot: number) => experiences[slot % experiences.length];

export default function Experiences() {
    // the logo being hovered (or tapped), which overrides the centred one
    const [hoverSlot, setHoverSlot] = useState<number | null>(null);
    // the logo nearest the middle of the marquee
    const [centerSlot, setCenterSlot] = useState<number | null>(null);
    const marqueeRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const pausedRef = useRef(false);
    const activeSlot = hoverSlot ?? centerSlot;
    const current = activeSlot === null ? null : experienceAt(activeSlot);

    useEffect(() => {
        pausedRef.current = hoverSlot !== null;
    }, [hoverSlot]);

    useEffect(() => {
        const marquee = marqueeRef.current;
        const track = trackRef.current;
        const group = track?.firstElementChild;
        if (!marquee || !track || !group) return;
        const items = Array.from(marquee.querySelectorAll<HTMLElement>('.ex-item'));

        // one group's width: the track repeats after this distance
        let loopW = group.getBoundingClientRect().width;
        const ro = new ResizeObserver(() => {
            loopW = group.getBoundingClientRect().width;
        });
        ro.observe(group);

        let visible = false;
        let x = 0;
        let velocity = -loopW / LOOP_SECONDS;
        let dragging = false;
        let pointerId: number | null = null;
        let lastX = 0;
        let lastT = 0;

        const tick = (_time: number, deltaMs: number) => {
            const dt = Math.min(deltaMs, 50) / 1000;
            if (!visible || dt <= 0 || loopW <= 0) return;

            if (!dragging) {
                const target = pausedRef.current ? 0 : -loopW / LOOP_SECONDS;
                velocity += (target - velocity) * (1 - Math.exp(-dt * SETTLE_RATE));
                x += velocity * dt;
            }

            // keep x in (-loopW, 0], whichever way it was dragged
            x = ((x % loopW) - loopW) % loopW;
            track.style.transform = `translate3d(${x}px, 0, 0)`;
        };
        gsap.ticker.add(tick);

        const onDown = (e: PointerEvent) => {
            if (e.button !== 0) return;
            pointerId = e.pointerId;
            lastX = e.clientX;
            lastT = e.timeStamp;
        };

        const onMove = (e: PointerEvent) => {
            if (e.pointerId !== pointerId) return;

            if (!dragging) {
                if (Math.abs(e.clientX - lastX) < DRAG_THRESHOLD) return;
                dragging = true;
                velocity = 0;
                marquee.setPointerCapture(e.pointerId);
                marquee.classList.add('is-dragging');
                // the caption follows the centred logo while dragging
                setHoverSlot(null);
                lastX = e.clientX;
                lastT = e.timeStamp;
                return;
            }

            const dx = e.clientX - lastX;
            const dt = (e.timeStamp - lastT) / 1000;
            x += dx;
            if (dt > 0) velocity = 0.7 * (dx / dt) + 0.3 * velocity;
            lastX = e.clientX;
            lastT = e.timeStamp;
        };

        const onEnd = (e: PointerEvent) => {
            if (e.pointerId !== pointerId) return;
            pointerId = null;
            if (!dragging) return;
            dragging = false;
            marquee.classList.remove('is-dragging');
            // held still before letting go: no throw
            if (e.timeStamp - lastT > 80) velocity = 0;
            velocity = Math.max(-MAX_THROW, Math.min(MAX_THROW, velocity));
        };

        marquee.addEventListener('pointerdown', onDown);
        marquee.addEventListener('pointermove', onMove);
        marquee.addEventListener('pointerup', onEnd);
        marquee.addEventListener('pointercancel', onEnd);

        let raf = 0;
        let last = -Infinity;
        const check = (now: number) => {
            raf = requestAnimationFrame(check);
            if (now - last < CENTER_CHECK_MS) return;
            last = now;
            const box = marquee.getBoundingClientRect();
            const mid = box.left + box.width / 2;
            let best = -1;
            let bestDist = Infinity;
            items.forEach((el, slot) => {
                const r = el.getBoundingClientRect();
                const d = Math.abs(r.left + r.width / 2 - mid);
                if (d < bestDist) {
                    bestDist = d;
                    best = slot;
                }
            });
            if (best >= 0) setCenterSlot(best);
        };

        // only track while the section is on screen
        const io = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            cancelAnimationFrame(raf);
            if (entry.isIntersecting) {
                last = -Infinity;
                raf = requestAnimationFrame(check);
            }
        });
        io.observe(marquee);
        return () => {
            io.disconnect();
            cancelAnimationFrame(raf);
            ro.disconnect();
            gsap.ticker.remove(tick);
            marquee.removeEventListener('pointerdown', onDown);
            marquee.removeEventListener('pointermove', onMove);
            marquee.removeEventListener('pointerup', onEnd);
            marquee.removeEventListener('pointercancel', onEnd);
        };
    }, []);

    return (
        <section className="ex-root" aria-labelledby="experience-label">
            <style>{css}</style>

            <h2 id="experience-label" className="ex-label">
                side quests
            </h2>

            <ul className="sr-only">
                {experiences.map((item) => (
                    <li key={item.name}>
                        {item.name}
                        {item.blurb ? `: ${item.blurb}` : ''}
                    </li>
                ))}
            </ul>

            <div
                ref={marqueeRef}
                className="ex-marquee"
                aria-hidden="true"
                onPointerLeave={(e) => {
                    if (e.pointerType === 'mouse') setHoverSlot(null);
                }}
            >
                <div ref={trackRef} className="ex-track">
                    {[0, 1].map((group) => (
                        <div key={group} className="ex-group">
                            {Array.from({ length: REPEATS }).flatMap((_, rep) =>
                                experiences.map((item, i) => {
                                    const slot = (group * REPEATS + rep) * experiences.length + i;
                                    return (
                                        <Logo
                                            key={`${rep}-${item.name}`}
                                            item={item}
                                            on={activeSlot === slot}
                                            onShow={(touch) =>
                                                setHoverSlot((h) => (touch && h === slot ? null : slot))
                                            }
                                        />
                                    );
                                })
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="ex-caption" aria-hidden="true">
                {current && (
                    <div key={current.name} className="ex-caption-body">
                        <p className="ex-caption-name">{current.name}</p>
                        {current.blurb && <p className="ex-caption-blurb">{current.blurb}</p>}
                    </div>
                )}
            </div>
        </section>
    );
}

const css = `
  .ex-root {
    --logo-h: clamp(52px, 5.6vw, 80px);
    --gap: clamp(44px, 6vw, 104px);
    position: relative;
    z-index: 2;
    padding: 10vh 0 12vh;
    background: var(--background, #fff);
    font-family: "Neue Montreal", "Helvetica Neue", Helvetica, Arial, sans-serif;
    text-align: center;
  }

  /* section heading, same display style as the contact page titles */
  .ex-label {
    margin: 0 0 clamp(28px, 3vw, 48px);
    padding: 0 clamp(16px, 4vw, 64px);
    font-size: clamp(28px, 3vw, 44px);
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.025em;
  }

  .ex-marquee {
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    width: 100%;
    padding: 8px 0;
    cursor: grab;
    /* phones: vertical swipes still scroll the page, horizontal ones drag the logos */
    touch-action: pan-y;
  }

  .ex-marquee.is-dragging {
    cursor: grabbing;
  }

  .ex-track {
    display: flex;
    width: max-content;
    will-change: transform;
  }

  .ex-group {
    display: flex;
    align-items: center;
    gap: var(--gap);
    padding-right: var(--gap);
  }

  .ex-item {
    display: block;
    -webkit-tap-highlight-color: transparent;
  }

  .ex-logo {
    position: relative;
    display: block;
    height: var(--logo-h);
    width: calc(var(--logo-h) * 3);
  }

  .ex-logo img {
    object-fit: contain;
    -webkit-user-drag: none;
    /* grey, with each logo's own shading kept but squeezed towards a mid grey, so dark and
       light logos end up about the same tone */
    filter: grayscale(1) contrast(0.35);
    opacity: 0.75;
    transition:
      filter 0.45s ease,
      opacity 0.45s ease,
      transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .ex-item.is-on .ex-logo img {
    filter: none;
    opacity: 1;
    transform: scale(1.05);
  }

  @media (hover: hover) {
    .ex-item:hover .ex-logo img {
      filter: none;
      opacity: 1;
      transform: scale(1.05);
    }
  }

  .ex-caption {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    min-height: 90px;
    margin-top: 32px;
    padding: 0 clamp(16px, 4vw, 64px);
  }

  .ex-caption-body {
    max-width: 34em;
    /* the site-wide fade-in (globals.css), sped up because it follows the pointer */
    animation: load-reveal 0.45s ease both;
  }

  .ex-caption-name {
    margin: 0;
    font-size: clamp(22px, 2.2vw, 30px);
    font-weight: 600;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }

  .ex-caption-blurb {
    margin: 8px 0 0;
    font-size: clamp(16px, 1.3vw, 19px);
    line-height: 1.4;
    color: color-mix(in srgb, currentColor 65%, transparent);
  }


  @media (prefers-reduced-motion: reduce) {
    .ex-caption-body {
      animation: none;
    }
  }
`;
