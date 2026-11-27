'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { getLenis } from './SmoothScroll';

// The photo index as an endless field of scattered photos you wander around in.
//   drag (mouse or touch), scroll / trackpad, or arrow keys to move; flicks carry on and ease out.
//   the field is worked out cell by cell from where you are, so it goes on forever without
//   repeating: every spot gets its own photo, size and offset from a seeded hash of its
//   position (the same every visit), and no photo ever sits next to a copy of itself.
//   only enough frames to cover the window exist; they're reused as cells scroll in and out.
//   hover a photo to see which album it's from; click to open the album.
//   the album list at the bottom lights up that album's photos (keyboard focus also glides to one).

export type FieldAlbum = { href: string; title: string; subtitle: string };
// ratio: width / height as the photo is displayed; null when it couldn't be read
export type FieldPhoto = { src: string; album: number; ratio: number | null };

const FALLBACK_RATIO = 3 / 2;
// vertical photos all get the same 3:4 frame (cropped to fill); others keep their own shape
const PORTRAIT_RATIO = 3 / 4;

const CONFIG = {
    follow: 0.14, // how quickly the view catches up with where you've dragged / scrolled it
    friction: 0.93, // flick momentum kept per frame
    dragZoom: 0.955, // the field pulls back a little while you drag
    keyStep: 160, // px per arrow key press
    leaveDelay: 0.34, // s between clicking a photo and the album opening
    seed: 5596,
} as const;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const pad2 = (n: number) => String(n).padStart(2, '0');
const odd = (n: number) => (n & 1) === 1; // also right for negatives (two's complement)

// a well-mixed 32-bit hash of a cell position
function hash(x: number, y: number, salt: number) {
    let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(salt + CONFIG.seed, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
}
const unit = (x: number, y: number, salt: number) => hash(x, y, salt) / 4294967296;

type Geom = { key: string; photo: number; x: number; y: number; w: number; h: number };

// Neighbours each cell must differ from, by which of the four (column, row) parity classes it's
// in. Every pair of touching cells (including diagonals, which the staggered columns make into
// real neighbours) is checked by the later class of the two, and each class only looks at
// earlier ones, so working out any cell takes at most three steps.
const AVOID: [number, number][][] = [
    [], // even column, even row: free pick
    [[-1, 0], [1, 0]], // odd, even
    [[0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]], // even, odd
    [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]], // odd, odd
];

function makeField(photos: FieldPhoto[], vw: number) {
    const count = photos.length;
    const scale = vw < 760 ? 0.62 : vw < 1200 ? 0.85 : 1;
    const cellW = 380 * scale;
    const cellH = 430 * scale;
    const inset = 22 * scale;

    const picks = new Map<string, number>();
    const geoms = new Map<string, Geom>();

    const photoAt = (gx: number, gy: number): number => {
        const key = `${gx},${gy}`;
        const known = picks.get(key);
        if (known !== undefined) return known;

        const avoid = new Set<number>();
        if (count > 9) {
            for (const [dx, dy] of AVOID[(odd(gx) ? 1 : 0) + (odd(gy) ? 2 : 0)]) {
                avoid.add(photoAt(gx + dx, gy + dy));
            }
        }
        const start = hash(gx, gy, 1) % count;
        let pick = start;
        for (let i = 0; i < count; i++) {
            const p = (start + i) % count;
            if (!avoid.has(p)) {
                pick = p;
                break;
            }
        }

        if (picks.size > 50000) picks.clear();
        picks.set(key, pick);
        return pick;
    };

    const cellAt = (gx: number, gy: number): Geom => {
        const key = `${gx},${gy}`;
        const known = geoms.get(key);
        if (known) return known;

        const photo = photoAt(gx, gy);
        const real = photos[photo]?.ratio ?? FALLBACK_RATIO;
        const ratio = real < 1 ? PORTRAIT_RATIO : real;

        // roughly the same amount of photo in every frame, in the photo's own shape,
        // shrunk if a very wide or tall one wouldn't fit its cell
        const area = 62000 * scale * scale * (0.7 + unit(gx, gy, 2) * 0.6);
        let w = Math.sqrt(area * ratio);
        let h = w / ratio;
        const fit = Math.min(1, (cellW - inset * 2) / w, (cellH - inset * 2) / h);
        w *= fit;
        h *= fit;

        const x = gx * cellW + inset + unit(gx, gy, 3) * Math.max(0, cellW - w - inset * 2);
        const y =
            gy * cellH +
            (odd(gx) ? cellH * 0.5 : 0) + // stagger every other column
            inset +
            unit(gx, gy, 4) * Math.max(0, cellH - h - inset * 2);

        const g = { key, photo, x, y, w, h };
        if (geoms.size > 20000) geoms.clear();
        geoms.set(key, g);
        return g;
    };

    // the cells that can show up in a window at this camera offset (with a cell to spare)
    const range = (camX: number, camY: number, vw: number, vh: number) => ({
        x0: Math.floor(-camX / cellW) - 1,
        x1: Math.floor((vw - camX) / cellW) + 1,
        y0: Math.floor(-camY / cellH) - 2, // staggered columns hang half a cell lower
        y1: Math.floor((vh - camY) / cellH) + 1,
    });

    // enough frames for the largest range() at this window size
    const poolSize = (vw: number, vh: number) =>
        (Math.ceil(vw / cellW) + 3) * (Math.ceil(vh / cellH) + 4);

    const parseKey = (key: string) => key.split(',').map(Number) as [number, number];

    return { scale, cellW, cellH, photoAt, cellAt, range, poolSize, parseKey };
}

type FieldModel = ReturnType<typeof makeField>;

// which cell each frame shows, for a camera offset; keeps frames on the cells they already show
function assign(model: FieldModel, slots: (string | null)[], camX: number, camY: number, vw: number, vh: number) {
    const { x0, x1, y0, y1 } = model.range(camX, camY, vw, vh);
    const needed = new Set<string>();
    for (let gx = x0; gx <= x1; gx++) {
        for (let gy = y0; gy <= y1; gy++) needed.add(`${gx},${gy}`);
    }

    const next = slots.slice();
    const free: number[] = [];
    next.forEach((key, i) => {
        if (key && needed.has(key)) needed.delete(key);
        else free.push(i);
    });

    let changed = false;
    for (const key of needed) {
        const i = free.shift();
        if (i === undefined) break;
        next[i] = key;
        changed = true;
    }
    // frames whose cell left the window and weren't reused stay as they are (hidden)
    return changed ? next : slots;
}

// the server doesn't know the window size; this is close to a typical laptop
const SERVER_VIEW = { w: 1440, h: 900 };

function FieldImage({ src }: { src: string }) {
    const [loaded, setLoaded] = useState(false);
    return (
        <Image
            src={src}
            alt=""
            fill
            sizes="(max-width: 760px) 220px, 340px"
            className={`object-cover cv-img${loaded ? ' is-loaded' : ''}`}
            loading="eager"
            draggable={false}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
        />
    );
}

type SlotProps = {
    index: number;
    cell: string | null;
    model: FieldModel;
    photos: FieldPhoto[];
    albums: FieldAlbum[];
    setRef: (index: number, el: HTMLAnchorElement | null) => void;
    onOpen: (e: React.MouseEvent<HTMLAnchorElement>, index: number, href: string) => void;
};

// One reusable frame. The frame loop moves it (and only shows it once it has rendered the cell
// it's been given, via data-cell).
const Slot = memo(function Slot({ index, cell, model, photos, albums, setRef, onOpen }: SlotProps) {
    const ref = useCallback((el: HTMLAnchorElement | null) => setRef(index, el), [index, setRef]);

    if (!cell) {
        return <a ref={ref} className="cv-item" aria-hidden="true" tabIndex={-1} style={{ visibility: 'hidden' }} />;
    }

    const [gx, gy] = model.parseKey(cell);
    const g = model.cellAt(gx, gy);
    const p = photos[g.photo];
    const a = albums[p.album];

    return (
        <Link
            ref={ref}
            href={a.href}
            className="cv-item"
            data-cell={cell}
            data-album={p.album}
            tabIndex={-1}
            aria-hidden="true"
            draggable={false}
            prefetch={false}
            style={{ width: g.w, height: g.h, visibility: 'hidden' }}
            onClick={(e) => onOpen(e, index, a.href)}
        >
            <span className="cv-photo">
                <FieldImage key={p.src} src={p.src} />
            </span>
            <span className="cv-cap">
                <span className="cv-cap-title">{a.title}</span>
                <span className="cv-cap-sub">{a.subtitle}</span>
            </span>
        </Link>
    );
});

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
    const coordRef = useRef<HTMLSpanElement>(null);
    const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
    const glideRef = useRef<((album: number) => void) | null>(null);
    const openRef = useRef<((slot: number, href: string) => boolean) | null>(null);

    const [view, setView] = useState(SERVER_VIEW);
    const model = useMemo(() => makeField(photos, view.w), [photos, view.w]);
    const pool = model.poolSize(view.w, view.h);

    // which cell each frame is showing; starts with the first window at the origin
    const [slots, setSlots] = useState<(string | null)[]>(() =>
        assign(model, Array(pool).fill(null), 0, 0, view.w, view.h)
    );
    // the frame loop's copy, always the latest assignment (React's may lag a frame behind)
    const slotsRef = useRef(slots);

    // re-lay out only when the window changes enough to matter
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

    const setRef = useCallback((i: number, el: HTMLAnchorElement | null) => {
        itemRefs.current[i] = el;
    }, []);

    const onOpen = useCallback((e: React.MouseEvent<HTMLAnchorElement>, i: number, href: string) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (openRef.current?.(i, href)) e.preventDefault();
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

    // the camera survives re-layouts (window resizes)
    const camRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

    useEffect(() => {
        const root = rootRef.current;
        const layer = layerRef.current;
        if (!root || !layer) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const frames = itemRefs.current;

        let vw = root.clientWidth;
        let vh = root.clientHeight;
        const onResize = () => {
            vw = root.clientWidth;
            vh = root.clientHeight;
        };
        window.addEventListener('resize', onResize);

        const c = camRef.current;
        const cam = { x: c.x, y: c.y };
        const target = { x: c.tx, y: c.ty };
        const vel = { x: 0, y: 0 };
        let zoom = 1;
        let shownZoom = -1;
        let shownCoord = '';
        let opening = false;

        // the pool may have grown or shrunk with the window
        if (slotsRef.current.length !== pool) {
            const resized = slotsRef.current.slice(0, pool);
            while (resized.length < pool) resized.push(null);
            slotsRef.current = assign(model, resized, cam.x, cam.y, vw, vh);
            setSlots(slotsRef.current);
        }

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

        // glide to the nearest photo from an album (keyboard focus on the album list):
        // search outwards ring by ring from the cell in the middle of the window
        glideRef.current = (album) => {
            const cx = Math.floor((vw / 2 - cam.x) / model.cellW);
            const cy = Math.floor((vh / 2 - cam.y) / model.cellH);
            let best: Geom | null = null;
            let bestD = Infinity;
            for (let r = 0; r <= 14 && !best; r++) {
                for (let gx = cx - r; gx <= cx + r; gx++) {
                    for (let gy = cy - r; gy <= cy + r; gy++) {
                        if (Math.max(Math.abs(gx - cx), Math.abs(gy - cy)) !== r) continue;
                        if (photos[model.photoAt(gx, gy)].album !== album) continue;
                        const g = model.cellAt(gx, gy);
                        const d = Math.hypot(g.x + g.w / 2 + cam.x - vw / 2, g.y + g.h / 2 + cam.y - vh / 2);
                        if (d < bestD) {
                            bestD = d;
                            best = g;
                        }
                    }
                }
            }
            if (!best) return;
            target.x = vw / 2 - (best.x + best.w / 2);
            target.y = vh / 2 - (best.y + best.h / 2);
            vel.x = vel.y = 0;
        };

        let leaveCall: gsap.core.Tween | null = null;
        openRef.current = (slot, href) => {
            const el = itemRefs.current[slot];
            if (opening || reduceMotion || !el) return false;
            opening = true;
            vel.x = vel.y = 0;
            target.x = cam.x;
            target.y = cam.y;
            el.classList.add('is-chosen');
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
            c.x = cam.x;
            c.y = cam.y;
            c.tx = target.x;
            c.ty = target.y;

            const zTarget = drag.moved && drag.active && !reduceMotion ? CONFIG.dragZoom : 1;
            zoom += (zTarget - zoom) * Math.min(1, 0.12 * f);
            if (Math.abs(zoom - shownZoom) > 0.0005) {
                layer.style.transform = `scale(${zoom.toFixed(4)})`;
                shownZoom = zoom;
            }

            // hand frames to cells coming into view (React renders their photos)
            const current = slotsRef.current;
            const next = assign(model, current, cam.x, cam.y, vw, vh);
            if (next !== current) {
                slotsRef.current = next;
                setSlots(next);
            }

            // place every frame that has rendered its cell; hide the rest
            const els = itemRefs.current;
            for (let i = 0; i < pool; i++) {
                const el = els[i];
                if (!el) continue;
                const key = el.dataset.cell;
                if (!key || key !== next[i]) {
                    if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
                    continue;
                }
                const [gx, gy] = model.parseKey(key);
                const g = model.cellAt(gx, gy);
                el.style.transform = `translate3d(${(g.x + cam.x).toFixed(1)}px, ${(g.y + cam.y).toFixed(1)}px, 0)`;
                if (el.style.visibility !== 'visible') el.style.visibility = 'visible';
            }

            if (coordRef.current) {
                const fmt = (v: number) => {
                    const n = Math.round(-v / 10);
                    return `${n < 0 ? '-' : '+'}${String(Math.abs(n)).padStart(4, '0')}`;
                };
                const s = `x ${fmt(cam.x)}  y ${fmt(cam.y)}`;
                if (s !== shownCoord) {
                    coordRef.current.textContent = s;
                    shownCoord = s;
                }
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
            frames.forEach((el) => el?.classList.remove('is-chosen'));
        };
    }, [model, pool, photos, router]);

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

    return (
        <section ref={rootRef} className="cv-root" data-lenis-prevent>
            <style>{css + albumCss}</style>

            <div ref={layerRef} className="cv-layer media-reveal" style={{ animationDelay: '0.1s' }}>
                {slots.map((cell, i) => (
                    <Slot
                        key={i}
                        index={i}
                        cell={cell}
                        model={model}
                        photos={photos}
                        albums={albums}
                        setRef={setRef}
                        onOpen={onOpen}
                    />
                ))}
            </div>

            <header className="cv-head load-reveal" style={{ animationDelay: '0.2s' }}>
                <h1 className="cv-title">
                    photo vault
                    <span className="sr-only">: life through jackson zhou&apos;s lens</span>
                </h1>
                <p className="cv-hint">
                    <span className="cv-hint-fine">drag, scroll or use the arrow keys to explore</span>
                    <span className="cv-hint-touch">drag to explore</span>
                </p>
            </header>

            <span ref={coordRef} className="cv-coord load-reveal" aria-hidden="true">
                x +0000  y +0000
            </span>

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
  html.cv-leaving .cv-coord,
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

  .cv-head {
    position: absolute;
    left: var(--pad);
    top: calc(var(--pad) + 52px);
    z-index: 2;
    pointer-events: none;
  }

  .cv-title {
    margin: 0;
    font-size: clamp(28px, 3.4vw, 46px);
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.035em;
  }

  .cv-hint {
    margin: 10px 0 0;
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

  .cv-coord {
    position: absolute;
    right: var(--pad);
    top: calc(var(--pad) + 58px);
    z-index: 2;
    font-family: var(--font-geist-mono), ui-monospace, monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    white-space: pre;
    opacity: 0.5;
    font-variant-numeric: tabular-nums;
    pointer-events: none;
  }

  .cv-head,
  .cv-coord,
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

    .cv-coord {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cv-photo, .cv-img, .cv-cap { transition: none; }
  }
`;
