'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { getLenis, getScrollY } from './SmoothScroll';

// The photo index as a darkroom drying line. Every album is a print clipped to a wire that sags
// across the screen.
//   desktop: the section pins and scrolling down pulls the roll sideways along the wire.
//   phones:  the roll is a native horizontal swipe; the wire stays put.
// Prints ride the curve of the wire (dipping in the middle), swing from the movement, and start
// as colour negatives that develop once they reach the middle of the screen. Once a print has
// developed it stays developed. Hovering a print straightens it and develops it right away.

export type DarkroomPrint = {
    href: string;
    image: string;
    title: string;
    subtitle: string;
};

const PIN_QUERY = '(hover: hover) and (min-width: 761px)';

const CONFIG = {
    sag: 0.05, // resting dip of the wire at the middle, fraction of the window height
    sagBounce: 0.5, // extra dip per px/frame of roll speed
    maxSagBounce: 46, // px
    swing: 0.32, // degrees of swing per px/frame of roll speed
    maxSwing: 16, // degrees
    stiffness: 0.05, // swing spring
    damping: 0.085,
    nudge: 0.035, // degrees of angular speed per px the cursor moves across a print
    developFrom: 0.92, // a print starts developing when its centre passes this (fraction of width)
    developTo: 0.52, // and is fully exposed here
    developRate: 0.035, // how fast the image catches up (per frame); keeps it a slow fade
} as const;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
};

// small fixed "hand hung" tilt per print, so the line doesn't look machine-made
const baseTilt = (i: number) => (((i * 37) % 7) - 3) * 0.55;
const isWide = (i: number) => i % 3 === 1;
const pad2 = (n: number) => String(n).padStart(2, '0');

export default function Darkroom({ prints }: { prints: DarkroomPrint[] }) {
    const rootRef = useRef<HTMLElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const wireRef = useRef<SVGSVGElement>(null);
    const barRef = useRef<HTMLSpanElement>(null);
    const countRef = useRef<HTMLSpanElement>(null);
    const hangRefs = useRef<(HTMLAnchorElement | null)[]>([]);
    const scrollToRef = useRef<((i: number) => void) | null>(null);

    const total = prints.length;

    useEffect(() => {
        const root = rootRef.current;
        const stage = stageRef.current;
        const viewport = viewportRef.current;
        const track = trackRef.current;
        const wire = wireRef.current;
        if (!root || !stage || !viewport || !track || !wire) return;

        const hangs = hangRefs.current.slice(0, total).filter(Boolean) as HTMLAnchorElement[];
        if (hangs.length !== total) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const pinQuery = window.matchMedia(PIN_QUERY);
        let pinned = pinQuery.matches;

        const nav = document.querySelector<HTMLElement>('[data-site-nav]');
        root.style.setProperty('--nav-h', `${nav?.offsetHeight ?? 56}px`);

        // ---- layout, measured on resize ----
        let vw = 1;
        let vh = 1;
        let lineTop = 0;
        let travel = 0;
        let rootTop = 0;
        const centers = hangs.map(() => 0); // print centre, in track px

        const measure = () => {
            pinned = pinQuery.matches;
            root.classList.toggle('is-pinned', pinned);
            // phones / narrow windows: let the sideways scroller handle its own wheel input
            if (pinned) viewport.removeAttribute('data-lenis-prevent-wheel');
            else viewport.setAttribute('data-lenis-prevent-wheel', '');

            vw = stage.clientWidth || window.innerWidth;
            vh = window.innerHeight;
            lineTop = wire.getBoundingClientRect().top - stage.getBoundingClientRect().top;

            hangs.forEach((h, i) => {
                centers[i] = h.offsetLeft + h.offsetWidth / 2;
            });

            if (pinned) {
                travel = Math.max(0, track.scrollWidth - vw);
                root.style.height = `${travel + vh}px`;
                rootTop = root.getBoundingClientRect().top + window.scrollY;
            } else {
                travel = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
                root.style.height = '';
                track.style.transform = '';
            }
        };
        measure();

        const ro = new ResizeObserver(measure);
        ro.observe(track);
        ro.observe(stage);
        window.addEventListener('resize', measure);
        pinQuery.addEventListener('change', measure);

        // ---- per-print state ----
        const angle = hangs.map((_, i) => baseTilt(i));
        const spin = hangs.map(() => 0);
        const dev = hangs.map((): number => (reduceMotion ? 1 : 0));
        const shownDev = hangs.map(() => -1);
        let hovered = -1;
        let developed = -1;

        const listeners: (() => void)[] = [];
        hangs.forEach((h, i) => {
            const enter = (e: PointerEvent) => {
                if (e.pointerType === 'mouse') hovered = i;
            };
            const leave = () => {
                if (hovered === i) hovered = -1;
            };
            const move = (e: PointerEvent) => {
                if (e.pointerType !== 'mouse' || reduceMotion) return;
                spin[i] += clamp(e.movementX, -40, 40) * CONFIG.nudge;
            };
            h.addEventListener('pointerenter', enter);
            h.addEventListener('pointerleave', leave);
            h.addEventListener('pointermove', move);
            listeners.push(() => {
                h.removeEventListener('pointerenter', enter);
                h.removeEventListener('pointerleave', leave);
                h.removeEventListener('pointermove', move);
            });
        });

        // keyboard: bring the focused print to the middle of the screen
        scrollToRef.current = (i) => {
            if (pinned) {
                const y = clamp(rootTop + centers[i] - vw / 2, rootTop, rootTop + travel);
                const lenis = getLenis();
                if (lenis) lenis.scrollTo(y, { duration: 1 });
                else window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
            } else {
                viewport.scrollTo({
                    left: clamp(centers[i] - vw / 2, 0, travel),
                    behavior: reduceMotion ? 'auto' : 'smooth',
                });
            }
        };

        // only animate while the section is on screen
        let visible = true;
        const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
        io.observe(root);

        let lastOffset = 0;
        let speed = 0; // smoothed roll speed, px/frame (positive = prints moving left)
        let sagBounce = 0;
        let sagVel = 0;
        let shownSag = -1;
        let shownBar = -1;

        const tick = (_t: number, deltaMs: number) => {
            if (!visible) return;
            const f = clamp(deltaMs / (1000 / 60), 0.25, 3); // frames elapsed at 60fps

            // how far the roll has moved, px
            let offset: number;
            if (pinned) {
                offset = clamp(getScrollY() - rootTop, 0, travel);
                track.style.transform = `translate3d(${-offset}px, 0, 0)`;
            } else {
                offset = viewport.scrollLeft;
            }

            const raw = (offset - lastOffset) / f;
            lastOffset = offset;
            speed += (raw - speed) * 0.2;

            // the wire dips further while the roll moves
            const sagBase = vh * CONFIG.sag;
            if (reduceMotion) {
                sagBounce = 0;
            } else {
                const sagTarget = Math.min(Math.abs(speed) * CONFIG.sagBounce, CONFIG.maxSagBounce);
                sagVel += ((sagTarget - sagBounce) * 0.06 - sagVel * 0.16) * f;
                sagBounce += sagVel * f;
            }
            const sag = sagBase + sagBounce;
            if (Math.abs(sag - shownSag) > 0.05) {
                stage.style.setProperty('--sag', `${sag.toFixed(2)}px`);
                shownSag = sag;
            }

            const half = vw / 2;
            const swingTarget = clamp(-speed * CONFIG.swing, -CONFIG.maxSwing, CONFIG.maxSwing);
            let count = 0;

            for (let i = 0; i < hangs.length; i++) {
                const sx = centers[i] - offset; // print centre on screen
                const u = (sx - half) / half;
                const y = lineTop + sag * (1 - u * u);

                // swing: a damped spring per print, each a little different so they ripple
                if (reduceMotion) {
                    angle[i] = baseTilt(i);
                } else {
                    const target = hovered === i ? 0 : baseTilt(i) + swingTarget;
                    const k = CONFIG.stiffness + (i % 3) * 0.008;
                    spin[i] += ((target - angle[i]) * k - spin[i] * CONFIG.damping) * f;
                    angle[i] += spin[i] * f;
                }

                // developing: only ever goes forward
                const exposure =
                    hovered === i ? 1 : smooth(vw * CONFIG.developFrom, vw * CONFIG.developTo, sx);
                if (exposure > dev[i]) {
                    const rate = hovered === i ? CONFIG.developRate * 3 : CONFIG.developRate;
                    dev[i] = Math.min(exposure, dev[i] + (exposure - dev[i]) * rate * f + 0.002 * f);
                }
                if (Math.abs(dev[i] - shownDev[i]) > 0.004) {
                    hangs[i].style.setProperty('--dev', dev[i].toFixed(3));
                    shownDev[i] = dev[i];
                }
                if (dev[i] > 0.97) count++;

                hangs[i].style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) rotate(${angle[i].toFixed(3)}deg)`;
            }

            if (count !== developed && countRef.current) {
                countRef.current.textContent = pad2(count);
                developed = count;
            }

            const p = travel > 0 ? offset / travel : 0;
            if (Math.abs(p - shownBar) > 0.001 && barRef.current) {
                barRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
                shownBar = p;
            }
        };

        root.classList.add('is-live');
        gsap.ticker.add(tick);

        return () => {
            gsap.ticker.remove(tick);
            ro.disconnect();
            io.disconnect();
            window.removeEventListener('resize', measure);
            pinQuery.removeEventListener('change', measure);
            listeners.forEach((off) => off());
            scrollToRef.current = null;
            root.classList.remove('is-live', 'is-pinned');
            root.style.height = '';
            track.style.transform = '';
            hangs.forEach((h) => {
                h.style.transform = '';
                h.style.removeProperty('--dev');
            });
        };
    }, [total]);

    return (
        <section ref={rootRef} className="dr-root">
            <style>{css}</style>
            <noscript>
                <style>{`.dr-hang { --dev: 1 !important; }`}</style>
            </noscript>

            <div ref={stageRef} className="dr-stage">
                <svg
                    ref={wireRef}
                    className="dr-wire"
                    viewBox="0 0 1000 50"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <path d="M0 0 Q500 100 1000 0" vectorEffect="non-scaling-stroke" />
                </svg>

                <div ref={viewportRef} className="dr-viewport">
                    <div ref={trackRef} className="dr-track">
                        <header className="dr-intro load-reveal">
                            <p className="dr-kicker">darkroom / {pad2(total)} rolls</p>
                            <h1 className="dr-title">
                                photo
                                <br />
                                vault
                                <span className="sr-only">: life through jackson zhou&apos;s lens</span>
                            </h1>
                            <p className="dr-lede">
                                every album is a print hung up to dry. pull the roll through and
                                watch each one develop.
                            </p>
                        </header>

                        <ol className="dr-line">
                            {prints.map((p, i) => (
                                <li key={p.href} className="dr-item">
                                    <Link
                                        href={p.href}
                                        ref={(el) => {
                                            hangRefs.current[i] = el;
                                        }}
                                        className={`dr-hang${isWide(i) ? ' is-wide' : ''}`}
                                        onFocus={(e) => {
                                            // keyboard only; a mouse click shouldn't move the roll
                                            if (e.currentTarget.matches(':focus-visible'))
                                                scrollToRef.current?.(i);
                                        }}
                                    >
                                        <span className="dr-pin" aria-hidden="true" />
                                        <span
                                            className="dr-paper media-reveal"
                                            style={{ animationDelay: `${0.15 + i * 0.06}s` }}
                                        >
                                            <span className="dr-img">
                                                <Image
                                                    src={p.image}
                                                    alt=""
                                                    fill
                                                    sizes="(max-width: 760px) 80vw, 620px"
                                                    className="object-cover"
                                                    priority={i < 3}
                                                    draggable={false}
                                                />
                                            </span>
                                            <span className="dr-cap">
                                                <span className="dr-no">
                                                    no.{pad2(total - i)}
                                                </span>
                                                <span className="dr-name">{p.title}</span>
                                                <span className="dr-sub">{p.subtitle}</span>
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ol>

                        <div className="dr-end">
                            <p className="dr-kicker">end of roll</p>
                            <p className="dr-lede">more prints are drying. in the meantime:</p>
                            <Link href="/videos" className="dr-endlink">
                                watch the videos
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="dr-bar load-reveal" style={{ animationDelay: '0.5s' }}>
                    <span className="dr-hint">
                        <span className="dr-hint-pin">scroll</span>
                        <span className="dr-hint-touch">swipe</span> to develop
                    </span>
                    <span className="dr-progress" aria-hidden="true">
                        <span ref={barRef} className="dr-progress-fill" />
                    </span>
                    <span className="dr-count">
                        <span ref={countRef}>00</span> / {pad2(total)} developed
                    </span>
                </div>
            </div>
        </section>
    );
}

const css = `
  .dr-root {
    --pad: clamp(18px, 4vw, 64px);
    --gap: clamp(36px, 5.5vw, 104px);
    --line-top: calc(var(--nav-h, 56px) + 8vh);
    --ph: clamp(220px, min(48vh, 100svh - 400px), 560px);
    --paper: #f2eee5;
    --ink: #1b1a18;
    position: relative;
  }

  .dr-stage {
    --sag: 5vh;
    position: relative;
    height: 100svh;
    min-height: 560px;
    overflow: clip;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  }

  .dr-root.is-pinned .dr-stage {
    position: sticky;
    top: 0;
  }

  .dr-wire {
    position: absolute;
    left: 0;
    top: var(--line-top);
    width: 100%;
    height: var(--sag);
    overflow: visible;
    pointer-events: none;
    z-index: 2;
  }

  .dr-wire path {
    fill: none;
    stroke: color-mix(in srgb, currentColor 55%, transparent);
    stroke-width: 1.25px;
  }

  /* no JS / phones: a native sideways scroller */
  .dr-viewport {
    position: absolute;
    inset: 0;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
  }

  .dr-viewport::-webkit-scrollbar {
    display: none;
  }

  .dr-root.is-pinned .dr-viewport {
    overflow: visible;
    scroll-snap-type: none;
  }

  .dr-track {
    position: relative;
    display: flex;
    align-items: stretch;
    width: max-content;
    height: 100%;
    padding: 0 0 0 var(--pad);
    will-change: transform;
  }

  .dr-intro,
  .dr-end {
    flex-shrink: 0;
    align-self: center;
    box-sizing: border-box;
  }

  .dr-intro {
    width: clamp(280px, 34vw, 520px);
    margin-right: var(--gap);
    padding-top: calc(var(--line-top) * 0.6);
  }

  .dr-kicker {
    margin: 0 0 18px;
    font-family: var(--font-geist-mono), ui-monospace, monospace;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.6;
  }

  .dr-title {
    margin: 0;
    font-size: clamp(64px, 9vw, 148px);
    font-weight: 600;
    line-height: 0.86;
    letter-spacing: -0.045em;
  }

  .dr-lede {
    max-width: 22em;
    margin: 26px 0 0;
    font-size: 15px;
    line-height: 1.5;
    opacity: 0.65;
  }

  .dr-line {
    display: flex;
    gap: var(--gap);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .dr-item {
    flex-shrink: 0;
    scroll-snap-align: center;
  }

  .dr-hang {
    --dev: 0;
    position: relative;
    display: block;
    color: var(--ink);
    text-decoration: none;
    transform-origin: 50% 0;
    transform: translate3d(0, calc(var(--line-top) + var(--sag) * 0.6), 0);
    will-change: transform;
    -webkit-tap-highlight-color: transparent;
    outline: none;
  }

  .dr-pin {
    position: absolute;
    left: 50%;
    top: -11px;
    z-index: 3;
    width: 11px;
    height: 34px;
    margin-left: -5.5px;
    border-radius: 2px;
    background: linear-gradient(90deg, #a87c48, #d9b685 45%, #b08550);
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.3);
  }

  .dr-pin::after {
    content: "";
    position: absolute;
    left: -1px;
    right: -1px;
    top: 13px;
    height: 3px;
    border-radius: 1px;
    background: #6f6f6f;
  }

  .dr-paper {
    display: block;
    padding: 10px 10px 0;
    background: var(--paper);
    box-shadow:
      0 1px 1px rgb(0 0 0 / 0.08),
      0 14px 30px -12px rgb(0 0 0 / 0.35);
    transition:
      transform 0.6s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .dr-hang:hover .dr-paper,
  .dr-hang:focus-visible .dr-paper {
    transform: scale(1.035);
    box-shadow:
      0 1px 1px rgb(0 0 0 / 0.08),
      0 26px 50px -16px rgb(0 0 0 / 0.45);
  }

  .dr-hang:focus-visible .dr-paper {
    outline: 2px solid currentColor;
    outline-offset: 4px;
  }

  .dr-img {
    position: relative;
    display: block;
    height: var(--ph);
    aspect-ratio: 4 / 5;
    overflow: hidden;
    background: #2a2622;
  }

  .dr-hang.is-wide .dr-img {
    aspect-ratio: 3 / 2;
  }

  /* the negative: inverted, flat and orange-masked, fading to the real print as --dev goes 0 to 1 */
  .dr-img img {
    filter:
      invert(calc(1 - var(--dev)))
      sepia(calc((1 - var(--dev)) * 0.45))
      contrast(calc(0.72 + var(--dev) * 0.28))
      saturate(calc(1 + (1 - var(--dev)) * 0.5));
  }

  .dr-img::after {
    content: "";
    position: absolute;
    inset: 0;
    background: #d4793c;
    mix-blend-mode: multiply;
    opacity: calc((1 - var(--dev)) * 0.42);
    pointer-events: none;
  }

  .dr-cap {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 12px;
    align-items: baseline;
    padding: 12px 2px 14px;
  }

  .dr-no {
    grid-row: span 2;
    font-family: var(--font-geist-mono), ui-monospace, monospace;
    font-size: 11px;
    letter-spacing: 0.06em;
    opacity: 0.55;
  }

  .dr-name {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 1.15;
  }

  .dr-sub {
    font-size: 12px;
    opacity: 0.6;
    line-height: 1.4;
  }

  .dr-end {
    width: clamp(240px, 26vw, 380px);
    margin-left: var(--gap);
    /* room for the last print to reach the middle of the screen */
    margin-right: max(var(--pad), calc(50vw - 380px));
    padding-top: calc(var(--line-top) * 0.6);
  }

  .dr-endlink {
    display: inline-block;
    margin-top: 18px;
    font-size: 15px;
    font-weight: 600;
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .dr-bar {
    position: absolute;
    left: var(--pad);
    right: var(--pad);
    bottom: clamp(18px, 4vh, 36px);
    z-index: 3;
    display: grid;
    grid-template-columns: 1fr minmax(80px, 260px) 1fr;
    align-items: center;
    column-gap: 20px;
    font-family: var(--font-geist-mono), ui-monospace, monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    pointer-events: none;
  }

  .dr-hint {
    opacity: 0.55;
  }

  .dr-hint-pin {
    display: none;
  }

  .dr-root.is-pinned .dr-hint-pin {
    display: inline;
  }

  .dr-root.is-pinned .dr-hint-touch {
    display: none;
  }

  .dr-progress {
    position: relative;
    height: 1px;
    background: color-mix(in srgb, currentColor 18%, transparent);
  }

  .dr-progress-fill {
    position: absolute;
    inset: 0;
    background: currentColor;
    transform: scaleX(0);
    transform-origin: 0 50%;
  }

  .dr-count {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 760px) {
    .dr-root {
      --ph: clamp(240px, 46svh, 440px);
      --line-top: calc(var(--nav-h, 56px) + 6svh);
      --gap: 28px;
    }

    .dr-intro {
      width: 74vw;
      margin-right: 32px;
    }

    .dr-title {
      font-size: clamp(56px, 17vw, 84px);
    }

    .dr-lede {
      font-size: 14px;
    }

    .dr-hang.is-wide .dr-img {
      max-width: 82vw;
      height: auto;
      width: min(82vw, calc(var(--ph) * 1.5));
    }

    .dr-img {
      max-width: 74vw;
      height: auto;
      width: min(74vw, calc(var(--ph) * 0.8));
    }

    .dr-end {
      width: 70vw;
      margin-right: 12vw;
    }

    .dr-bar {
      grid-template-columns: auto 1fr auto;
      column-gap: 14px;
      font-size: 10px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dr-paper { transition: none; }
  }
`;
