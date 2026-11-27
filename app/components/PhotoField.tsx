'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { getLenis } from './SmoothScroll';

// The photo index as an endless field of scattered photos you wander around in.
//   drag (mouse or touch), scroll / trackpad, or arrow keys to move; flicks carry on and ease out.
//   the field repeats in every direction, so there's no edge to hit.
//   hover a photo to see which album it's from; click to open the album.
//   the album list at the bottom lights up that album's photos (keyboard focus also glides to one).

export type FieldAlbum = { href: string; title: string; subtitle: string };
// ratio: width / height as the photo is displayed; null when it couldn't be read
export type FieldPhoto = { src: string; album: number; ratio: number | null };

const FALLBACK_RATIO = 3 / 2;
// vertical photos all get the same 3:4 frame (cropped to fill); others keep their own shape
const PORTRAIT_RATIO = 3 / 4;

type Cell = { photo: number; x: number; y: number; w: number; h: number };
type Field = { cells: Cell[]; tw: number; th: number; margin: number; scale: number };

const CONFIG = {
    follow: 0.14, // how quickly the view catches up with where you've dragged / scrolled it
    friction: 0.93, // flick momentum kept per frame
    dragZoom: 0.955, // the field pulls back a little while you drag
    keyStep: 160, // px per arrow key press
    leaveDelay: 0.34, // s between clicking a photo and the album opening
} as const;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const mod = (a: number, n: number) => ((a % n) + n) % n;
const pad2 = (n: number) => String(n).padStart(2, '0');

function mulberry32(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Lays the photos out on a loose, staggered grid, one per cell, with random sizes and offsets.
// Same input, same layout (seeded), so the server and the browser agree. The tile is always
// bigger than the window, so wrapping it never shows a gap.
function buildField(ratios: (number | null)[], vw: number, vh: number): Field {
    const count = ratios.length;
    const scale = vw < 760 ? 0.62 : vw < 1200 ? 0.85 : 1;
    const cellW = 380 * scale;
    const cellH = 430 * scale;
    const margin = 420 * scale; // room for a photo to slide fully off an edge before wrapping

    const cols = Math.max(Math.ceil(Math.sqrt(count * 1.1)), Math.ceil((vw + margin) / cellW) + 1);
    const rows = Math.max(Math.ceil(count / cols), Math.ceil((vh + margin) / cellH) + 1);

    const rand = mulberry32(5596);

    // shuffle once so albums are mixed through the field
    const order = Array.from({ length: count }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }

    const cells: Cell[] = [];
    const inset = 22 * scale;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const photo = order[(r * cols + c) % count];
            const real = ratios[photo] ?? FALLBACK_RATIO;
            const ratio = real < 1 ? PORTRAIT_RATIO : real;

            // roughly the same amount of photo in every frame, in the photo's own shape,
            // shrunk if a very wide or tall one wouldn't fit its cell
            const area = 62000 * scale * scale * (0.7 + rand() * 0.6);
            let w = Math.sqrt(area * ratio);
            let h = w / ratio;
            const fit = Math.min(1, (cellW - inset * 2) / w, (cellH - inset * 2) / h);
            w *= fit;
            h *= fit;

            const x = c * cellW + inset + rand() * Math.max(0, cellW - w - inset * 2);
            const y =
                r * cellH +
                (c % 2) * cellH * 0.5 + // stagger every other column
                inset +
                rand() * Math.max(0, cellH - h - inset * 2);
            cells.push({ photo, x, y, w, h });
        }
    }

    return { cells, tw: cols * cellW, th: rows * cellH, margin, scale };
}

// where a cell lands on screen for a given camera offset
const wrapX = (f: Field, x: number, cam: number) => mod(x + cam + f.margin, f.tw) - f.margin;
const wrapY = (f: Field, y: number, cam: number) => mod(y + cam + f.margin, f.th) - f.margin;

// the server doesn't know the window size; this is close to a typical laptop
const SERVER_VIEW = { w: 1440, h: 900 };

function FieldImage({ src, eager }: { src: string; eager: boolean }) {
    const [loaded, setLoaded] = useState(false);
    return (
        <Image
            src={src}
            alt=""
            fill
            sizes="(max-width: 760px) 220px, 340px"
            className={`object-cover cv-img${loaded ? ' is-loaded' : ''}`}
            priority={eager}
            loading={eager ? undefined : 'eager'}
            draggable={false}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
        />
    );
}

export default function PhotoField({
    albums,
    photos,
}: {
    albums: FieldAlbum[];
    photos: FieldPhoto[];
}) {
    const router = useRouter();
    const rootRef = useRef<HTMLElement>(null);
    const layerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
    const glideRef = useRef<((album: number) => void) | null>(null);
    const openRef = useRef<((cell: number, href: string) => boolean) | null>(null);

    const [view, setView] = useState(SERVER_VIEW);
    const ratios = useMemo(() => photos.map((p) => p.ratio), [photos]);
    const field = useMemo(() => buildField(ratios, view.w, view.h), [ratios, view]);

    // re-lay out only when the window changes enough to need a different tile
    useEffect(() => {
        const sync = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            setView((v) => (Math.abs(v.w - w) > 60 || Math.abs(v.h - h) > 60 ? { w, h } : v));
        };
        sync();
        window.addEventListener('resize', sync);
        return () => window.removeEventListener('resize', sync);
    }, []);

    // the field takes over the window: no page scroll, no footer
    useEffect(() => {
        const html = document.documentElement;
        html.classList.add('cv-lock');
        const lenis = getLenis();
        lenis?.stop();
        return () => {
            html.classList.remove('cv-lock', 'cv-leaving');
            lenis?.start();
        };
    }, []);

    useEffect(() => {
        const root = rootRef.current;
        const layer = layerRef.current;
        if (!root || !layer) return;

        const items = field.cells.map((_, i) => itemRefs.current[i]);
        if (items.some((el) => !el)) return;
        const els = items as HTMLAnchorElement[];

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let vw = root.clientWidth;
        let vh = root.clientHeight;
        const onResize = () => {
            vw = root.clientWidth;
            vh = root.clientHeight;
        };
        window.addEventListener('resize', onResize);

        const cam = { x: 0, y: 0 };
        const target = { x: 0, y: 0 };
        const vel = { x: 0, y: 0 };
        let zoom = 1;
        let shownZoom = -1;
        let opening = false;

        // ---- dragging ----
        const drag = {
            active: false,
            moved: false,
            id: -1,
            sx: 0,
            sy: 0,
            tx: 0,
            ty: 0,
            lx: 0,
            ly: 0,
            lt: 0,
        };

        const onDown = (e: PointerEvent) => {
            if (opening || (e.pointerType === 'mouse' && e.button !== 0)) return;
            if ((e.target as Element).closest('[data-cv-ui]')) return;
            drag.active = true;
            drag.moved = false;
            drag.id = e.pointerId;
            drag.sx = drag.lx = e.clientX;
            drag.sy = drag.ly = e.clientY;
            drag.lt = performance.now();
            drag.tx = target.x;
            drag.ty = target.y;
            vel.x = vel.y = 0;
        };

        const onMove = (e: PointerEvent) => {
            if (!drag.active || e.pointerId !== drag.id) return;
            const dx = e.clientX - drag.sx;
            const dy = e.clientY - drag.sy;
            if (!drag.moved && Math.hypot(dx, dy) > 6) {
                drag.moved = true;
                root.classList.add('is-dragging');
            }
            if (!drag.moved) return;

            target.x = drag.tx + dx;
            target.y = drag.ty + dy;

            // flick speed, in px per 60fps frame
            const now = performance.now();
            const dt = Math.max(1, now - drag.lt) / (1000 / 60);
            vel.x += ((e.clientX - drag.lx) / dt - vel.x) * 0.4;
            vel.y += ((e.clientY - drag.ly) / dt - vel.y) * 0.4;
            drag.lx = e.clientX;
            drag.ly = e.clientY;
            drag.lt = now;
        };

        const onUp = (e: PointerEvent) => {
            if (!drag.active || e.pointerId !== drag.id) return;
            drag.active = false;
            root.classList.remove('is-dragging');
            // held still before letting go: no flick
            if (performance.now() - drag.lt > 90 || reduceMotion) vel.x = vel.y = 0;
        };

        // a drag that ends on a photo shouldn't open it
        const onClickCapture = (e: MouseEvent) => {
            if (drag.moved) {
                e.preventDefault();
                e.stopPropagation();
                drag.moved = false;
            }
        };

        const onWheel = (e: WheelEvent) => {
            if ((e.target as Element).closest('[data-cv-ui]')) return;
            e.preventDefault();
            if (opening) return;
            const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vh : 1;
            // a plain mouse wheel only scrolls vertically; shift turns it sideways
            const sideways = e.shiftKey && !e.deltaX;
            target.x -= (sideways ? e.deltaY : e.deltaX) * k;
            target.y -= (sideways ? 0 : e.deltaY) * k;
            vel.x = vel.y = 0;
        };

        const onKey = (e: KeyboardEvent) => {
            if (opening || e.metaKey || e.ctrlKey || e.altKey) return;
            const step = CONFIG.keyStep * (e.shiftKey ? 3 : 1);
            const moves: Record<string, [number, number]> = {
                ArrowLeft: [step, 0],
                ArrowRight: [-step, 0],
                ArrowUp: [0, step],
                ArrowDown: [0, -step],
            };
            const m = moves[e.key];
            if (!m) return;
            e.preventDefault();
            target.x += m[0];
            target.y += m[1];
            vel.x = vel.y = 0;
        };

        root.addEventListener('pointerdown', onDown);
        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        root.addEventListener('click', onClickCapture, true);
        root.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('keydown', onKey);

        // glide to the nearest photo from an album (keyboard focus on the album list)
        glideRef.current = (album) => {
            let best = -1;
            let bestD = Infinity;
            field.cells.forEach((c, i) => {
                if (photos[c.photo].album !== album) return;
                const sx = wrapX(field, c.x, cam.x) + c.w / 2;
                const sy = wrapY(field, c.y, cam.y) + c.h / 2;
                const d = Math.hypot(sx - vw / 2, sy - vh / 2);
                if (d < bestD) {
                    bestD = d;
                    best = i;
                }
            });
            if (best < 0) return;
            const c = field.cells[best];
            target.x += vw / 2 - (wrapX(field, c.x, cam.x) + c.w / 2);
            target.y += vh / 2 - (wrapY(field, c.y, cam.y) + c.h / 2);
            vel.x = vel.y = 0;
        };

        let leaveCall: gsap.core.Tween | null = null;
        openRef.current = (cell, href) => {
            if (opening || reduceMotion) return false;
            opening = true;
            vel.x = vel.y = 0;
            target.x = cam.x;
            target.y = cam.y;
            els[cell].classList.add('is-chosen');
            root.classList.add('is-leaving');
            document.documentElement.classList.add('cv-leaving');
            router.prefetch(href);
            leaveCall = gsap.delayedCall(CONFIG.leaveDelay, () => router.push(href));
            return true;
        };

        // ---- frame loop ----
        const tick = (_t: number, deltaMs: number) => {
            const f = clamp(deltaMs / (1000 / 60), 0.25, 3);

            if (!drag.active) {
                target.x += vel.x * f;
                target.y += vel.y * f;
                const keep = Math.pow(CONFIG.friction, f);
                vel.x *= keep;
                vel.y *= keep;
                if (Math.abs(vel.x) < 0.01) vel.x = 0;
                if (Math.abs(vel.y) < 0.01) vel.y = 0;
            }

            const follow = reduceMotion ? 1 : Math.min(1, CONFIG.follow * f);
            cam.x += (target.x - cam.x) * follow;
            cam.y += (target.y - cam.y) * follow;

            const zTarget = drag.moved && drag.active && !reduceMotion ? CONFIG.dragZoom : 1;
            zoom += (zTarget - zoom) * Math.min(1, 0.12 * f);
            if (Math.abs(zoom - shownZoom) > 0.0005) {
                layer.style.transform = `scale(${zoom.toFixed(4)})`;
                shownZoom = zoom;
            }

            for (let i = 0; i < els.length; i++) {
                const c = field.cells[i];
                const x = wrapX(field, c.x, cam.x);
                const y = wrapY(field, c.y, cam.y);
                els[i].style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
            }
        };
        gsap.ticker.add(tick);

        return () => {
            gsap.ticker.remove(tick);
            leaveCall?.kill();
            glideRef.current = null;
            openRef.current = null;
            window.removeEventListener('resize', onResize);
            root.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            root.removeEventListener('click', onClickCapture, true);
            root.removeEventListener('wheel', onWheel);
            window.removeEventListener('keydown', onKey);
            root.classList.remove('is-dragging', 'is-leaving');
            els.forEach((el) => el.classList.remove('is-chosen'));
        };
    }, [field, photos, router]);

    // one rule per album: while it's picked in the list, every other photo fades back
    const albumCss = albums
        .map(
            (_, i) =>
                `.cv-root[data-album="${i}"] .cv-item:not([data-album="${i}"]) { opacity: 0.12; }
                 .cv-root[data-album="${i}"] .cv-item[data-album="${i}"] .cv-cap { opacity: 1; transform: none; }`
        )
        .join('\n');

    const setAlbum = (i: number | null) => {
        const root = rootRef.current;
        if (!root) return;
        if (i === null) delete root.dataset.album;
        else root.dataset.album = String(i);
    };

    // photos closest to the middle of the first view appear first
    const cx = view.w / 2;
    const cy = view.h / 2;

    return (
        <section ref={rootRef} className="cv-root" data-lenis-prevent>
            <style>{css + albumCss}</style>

            <div ref={layerRef} className="cv-layer">
                {field.cells.map((c, i) => {
                    const p = photos[c.photo];
                    const a = albums[p.album];
                    const x = wrapX(field, c.x, 0);
                    const y = wrapY(field, c.y, 0);
                    const onScreen = x + c.w > 0 && x < view.w && y + c.h > 0 && y < view.h;
                    const delay = Math.min(0.9, Math.hypot(x + c.w / 2 - cx, y + c.h / 2 - cy) / 1400);
                    return (
                        <Link
                            key={i}
                            ref={(el) => {
                                itemRefs.current[i] = el;
                            }}
                            href={a.href}
                            className="cv-item"
                            data-album={p.album}
                            tabIndex={-1}
                            aria-hidden="true"
                            draggable={false}
                            style={{
                                width: c.w,
                                height: c.h,
                                transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`,
                            }}
                            onClick={(e) => {
                                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
                                    return;
                                if (openRef.current?.(i, a.href)) e.preventDefault();
                            }}
                        >
                            <span
                                className="cv-photo media-reveal"
                                style={{ animationDelay: `${(0.1 + delay).toFixed(2)}s` }}
                            >
                                <FieldImage src={p.src} eager={onScreen} />
                            </span>
                            <span className="cv-cap">
                                <span className="cv-cap-title">{a.title}</span>
                                <span className="cv-cap-sub">{a.subtitle}</span>
                            </span>
                        </Link>
                    );
                })}
            </div>

            <header className="cv-head load-reveal" style={{ animationDelay: '0.2s' }}>
                {/* not shown, but keeps a page heading for screen readers and search */}
                <h1 className="sr-only">photo vault: life through jackson zhou&apos;s lens</h1>
                <p className="cv-hint">
                    <span className="cv-hint-fine">drag, scroll or use the arrow keys to explore</span>
                    <span className="cv-hint-touch">drag to explore</span>
                </p>
            </header>

            <nav
                className="cv-albums load-reveal"
                style={{ animationDelay: '0.45s' }}
                aria-label="albums"
                data-cv-ui
            >
                <ol>
                    {albums.map((a, i) => (
                        <li key={a.href}>
                            <Link
                                href={a.href}
                                onPointerEnter={(e) => e.pointerType === 'mouse' && setAlbum(i)}
                                onPointerLeave={() => setAlbum(null)}
                                onFocus={() => {
                                    setAlbum(i);
                                    glideRef.current?.(i);
                                }}
                                onBlur={() => setAlbum(null)}
                            >
                                <span className="cv-albums-no">{pad2(albums.length - i)}</span>
                                {a.title}
                            </Link>
                        </li>
                    ))}
                </ol>
            </nav>
        </section>
    );
}

const css = `
  html.cv-lock,
  html.cv-lock body {
    overflow: hidden;
    overscroll-behavior: none;
  }

  html.cv-lock footer {
    display: none;
  }

  html.cv-leaving .cv-head,
  html.cv-leaving .cv-albums {
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  .cv-root {
    --pad: clamp(16px, 3vw, 44px);
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    cursor: grab;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    background: var(--background);
  }

  .cv-root.is-dragging {
    cursor: grabbing;
  }

  .cv-layer {
    position: absolute;
    inset: 0;
    transform-origin: 50% 50%;
    will-change: transform;
  }

  .cv-item {
    position: absolute;
    left: 0;
    top: 0;
    display: block;
    color: inherit;
    text-decoration: none;
    will-change: transform;
    transition: opacity 0.45s ease;
    -webkit-tap-highlight-color: transparent;
    -webkit-user-drag: none;
  }

  .cv-photo {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: color-mix(in srgb, currentColor 6%, transparent);
    transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .cv-img {
    opacity: 0;
    transition:
      opacity 0.6s ease,
      transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
    pointer-events: none;
  }

  .cv-img.is-loaded {
    opacity: 1;
  }

  .cv-cap {
    position: absolute;
    left: 0;
    top: calc(100% + 10px);
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: max-content;
    max-width: 260px;
    opacity: 0;
    transform: translateY(-4px);
    transition:
      opacity 0.35s ease,
      transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
    pointer-events: none;
  }

  .cv-cap-title {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .cv-cap-sub {
    font-size: 12px;
    opacity: 0.55;
  }

  @media (hover: hover) {
    .cv-root:not(.is-dragging):not(.is-leaving) .cv-layer:has(.cv-item:hover) .cv-item:not(:hover) {
      opacity: 0.3;
    }

    .cv-root:not(.is-dragging) .cv-item:hover .cv-cap {
      opacity: 1;
      transform: none;
    }

    .cv-root:not(.is-dragging) .cv-item:hover .cv-img {
      transform: scale(1.05);
    }
  }

  /* opening an album: everything else fades, the chosen photo lifts */
  .cv-root.is-leaving .cv-item:not(.is-chosen) {
    opacity: 0;
    transition: opacity 0.28s ease;
  }

  .cv-root.is-leaving .cv-item.is-chosen .cv-photo {
    transform: scale(1.08);
  }

  /* white and inverted against whatever is behind it, like the site nav */
  .cv-head {
    position: absolute;
    left: var(--pad);
    top: calc(var(--pad) + 52px);
    z-index: 2;
    pointer-events: none;
    color: #fff;
    mix-blend-mode: difference;
  }

  .cv-hint {
    margin: 0;
    font-size: 13px;
    opacity: 0.55;
  }

  .cv-hint-touch {
    display: none;
  }

  @media (hover: none) {
    .cv-hint-fine { display: none; }
    .cv-hint-touch { display: inline; }
  }

  .cv-albums {
    text-shadow: 0 0 14px var(--background), 0 0 4px var(--background);
  }

  .cv-albums {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
    padding: 18px var(--pad) calc(18px + env(safe-area-inset-bottom));
    cursor: auto;
    touch-action: pan-x;
    background: linear-gradient(transparent, color-mix(in srgb, var(--background) 92%, transparent) 55%);
  }

  .cv-albums ol {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 22px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .cv-albums a {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    font-size: 13px;
    color: inherit;
    text-decoration: none;
    opacity: 0.55;
    white-space: nowrap;
    transition: opacity 0.25s ease;
  }

  .cv-albums a:hover,
  .cv-albums a:focus-visible {
    opacity: 1;
  }

  .cv-albums-no {
    font-family: var(--font-geist-mono), ui-monospace, monospace;
    font-size: 10px;
    opacity: 0.7;
  }

  @media (max-width: 760px) {
    .cv-albums ol {
      flex-wrap: nowrap;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .cv-albums ol::-webkit-scrollbar {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cv-photo, .cv-img, .cv-cap { transition: none; }
  }
`;
