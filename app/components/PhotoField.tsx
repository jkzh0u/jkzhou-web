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

export type FieldAlbum = { href: string; title: string; subtitle: string };
// ratio: width / height as the photo is displayed; null when it couldn't be read
export type FieldPhoto = { src: string; album: number; ratio: number | null };

const FALLBACK_RATIO = 3 / 2;
// vertical photos all get the same 3:4 frame (cropped to fill); others keep their own shape
const PORTRAIT_RATIO = 3 / 4;

// depth: how near the photo sits, 0.55 (far) to 1.05 (near). Nearer photos lead when the field
// moves, shift more with the mouse, and draw on top (like the homepage's tile depths).
type Cell = { photo: number; x: number; y: number; w: number; h: number; depth: number };
type Field = { cells: Cell[]; tw: number; th: number; margin: number; scale: number };

const CONFIG = {
    follow: 0.14, // how quickly the view catches up with where you've dragged / scrolled it
    friction: 0.93, // flick momentum kept per frame
    dragZoom: 0.955, // the field pulls back a little while you drag
    keyStep: 160, // px per arrow key press
    expandTime: 0.6, // s for a clicked photo to glide to the middle of the screen and grow
    dissolveTime: 0.3, // s for it to then fade into the background before the album opens
    maxGrow: 1.8, // a clicked photo grows at most this much (and never past its loaded resolution)
    // The homepage's cylinder: the field curves away from you, more the faster it moves.
    // Kept gentler than the homepage, so the tile's edges never come into view.
    bendBase: 0.15, // curve at rest
    bendSpeed: 0.45, // extra curve at full speed
    perspective: 0.7, // viewing distance, times the window's longer side (about 1000px on a laptop)
    // Depth, like the homepage: while the field moves, nearer photos lead and farther ones lag by
    // this many px per px-per-frame of speed (per unit of depth), up to depthMax of a cell; they
    // settle back into place when it stops. With a mouse they also shift by up to mouseShift px.
    depthLead: 1.5,
    depthMax: 0.04,
    mouseShift: 5,
    mouseSmoothing: 0.06,
    scatter: 140, // px the other photos drift away from the clicked one
} as const;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const mod = (a: number, n: number) => ((a % n) + n) % n;

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
    // room past each edge before a photo wraps: enough for one to slide fully off, and for the
    // cylinder curve (which pulls the edges in) never to show the end of the tile
    const margin = Math.max(420 * scale, 0.3 * Math.max(vw, vh));

    const cols = Math.max(Math.ceil(Math.sqrt(count * 1.1)), Math.ceil((vw + margin) / cellW) + 1);
    const rows = Math.max(Math.ceil(count / cols), Math.ceil((vh + margin) / cellH) + 1);

    const rand = mulberry32(5596);

    // shuffle once so albums are mixed through the field
    const order = Array.from({ length: count }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }

    // Which photo goes in each cell. There are usually more cells than photos, so some repeat.
    // Every photo is used once before any is used twice (least-used first, in shuffled order),
    // and a cell never takes a photo already within two cells of it, counting across the tile's
    // wrap, since the tile repeats edge to edge. If nothing fits, the reach shrinks to one cell.
    const used = new Array<number>(count).fill(0);
    const assigned: number[] = [];
    const wrap = (d: number, n: number) => {
        const a = Math.abs(d) % n;
        return Math.min(a, n - a);
    };
    const clashes = (r: number, c: number, photo: number, reach: number) => {
        for (let k = 0; k < assigned.length; k++) {
            if (assigned[k] !== photo) continue;
            const r2 = Math.floor(k / cols);
            const c2 = k % cols;
            if (wrap(r - r2, rows) <= reach && wrap(c - c2, cols) <= reach) return true;
        }
        return false;
    };
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const byUse = [...order].sort((a, b) => used[a] - used[b]); // stable: keeps the shuffle
            const photo =
                byUse.find((p) => !clashes(r, c, p, 2)) ??
                byUse.find((p) => !clashes(r, c, p, 1)) ??
                byUse[0];
            used[photo]++;
            assigned.push(photo);
        }
    }

    const cells: Cell[] = [];
    const inset = 22 * scale;
    // its own sequence, so adding depths didn't change the layout
    const depthRand = mulberry32(5596 ^ 0x5bd1e995);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const photo = assigned[r * cols + c];
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
            cells.push({ photo, x, y, w, h, depth: 0.55 + depthRand() * 0.5 });
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

        // On touch screens the curve is drawn flat: each photo is moved and squashed to where the
        // 3D version would show it, without real 3D. iOS Safari can't blend the navbar
        // (mix-blend-mode: difference) over 3D layers, so with them it turned white on white.
        const flat = window.matchMedia('(hover: none)').matches;

        let vw = root.clientWidth;
        let vh = root.clientHeight;
        // the viewing distance scales with the window, so the curve looks the same on any screen
        let persp = 1000;
        const setPerspective = () => {
            persp = Math.round(CONFIG.perspective * Math.max(vw, vh));
            layer.style.perspective = flat ? 'none' : `${persp}px`;
        };
        setPerspective();
        const onResize = () => {
            vw = root.clientWidth;
            vh = root.clientHeight;
            setPerspective();
        };
        window.addEventListener('resize', onResize);

        const cam = { x: 0, y: 0 };
        const target = { x: 0, y: 0 };
        const vel = { x: 0, y: 0 };
        let zoom = 1;
        let shownZoom = -1;
        let opening = false;
        // the cylinder curve, per axis: how fast the view is moving and how much it's bent
        const prevCam = { x: 0, y: 0 };
        const speed = { x: 0, y: 0 };
        const bend = { x: CONFIG.bendBase, y: CONFIG.bendBase };
        // smoothed signed speed (px per frame), for the depth lead / lag
        const flow = { x: 0, y: 0 };
        // the mouse, -1 to 1 from the middle of the window, and where it's heading
        const mouse = { x: 0, y: 0 };
        const mouseTarget = { x: 0, y: 0 };
        const onMouse = (e: PointerEvent) => {
            if (e.pointerType !== 'mouse' || reduceMotion) return;
            mouseTarget.x = (e.clientX / vw) * 2 - 1;
            mouseTarget.y = (e.clientY / vh) * 2 - 1;
        };
        window.addEventListener('pointermove', onMouse, { passive: true });
        // opening an album: the other photos drift away from the clicked one (0 to 1)
        const burst = { v: 0, x: 0, y: 0 };

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

        // Opening an album: a copy of the clicked photo lifts out of the field, glides to the middle
        // of the screen and grows a little while the rest drift away and fade, then it dissolves
        // into the background and the album page loads in with its usual reveal. It only grows as
        // far as the thumbnail it shows stays sharp (the field loads small images), so it never
        // blurs.
        let leaveTl: gsap.core.Timeline | null = null;
        let zoomEl: HTMLDivElement | null = null;
        openRef.current = (cell, href) => {
            if (opening || reduceMotion) return false;
            opening = true;
            vel.x = vel.y = 0;
            target.x = cam.x;
            target.y = cam.y;
            router.prefetch(href);

            const chosen = els[cell];
            const rect = (chosen.querySelector('.cv-photo') ?? chosen).getBoundingClientRect();
            const img = chosen.querySelector('img');
            burst.x = rect.left + rect.width / 2;
            burst.y = rect.top + rect.height / 2;

            zoomEl = document.createElement('div');
            zoomEl.className = 'cv-zoom';
            zoomEl.setAttribute('aria-hidden', 'true');
            if (img?.currentSrc || img?.src) {
                const copy = document.createElement('img');
                copy.src = img.currentSrc || img.src;
                copy.alt = '';
                zoomEl.appendChild(copy);
            }
            root.appendChild(zoomEl);

            chosen.classList.add('is-chosen');
            root.classList.add('is-leaving');
            document.documentElement.classList.add('cv-leaving');

            // how much bigger it can get: limited by the pixels the thumbnail actually has, by
            // maxGrow, and by 70% of the screen
            const dpr = window.devicePixelRatio || 1;
            const sharp = img?.naturalWidth ? img.naturalWidth / (rect.width * dpr) : 1;
            const grow = Math.max(
                1,
                Math.min(CONFIG.maxGrow, sharp, (vw * 0.7) / rect.width, (vh * 0.7) / rect.height)
            );
            const w = rect.width * grow;
            const h = rect.height * grow;

            leaveTl = gsap
                .timeline()
                .to(burst, { v: 1, duration: CONFIG.expandTime + 0.15, ease: 'power2.out' }, 0)
                .fromTo(
                    zoomEl,
                    { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                    {
                        left: (vw - w) / 2,
                        top: (vh - h) / 2,
                        width: w,
                        height: h,
                        duration: CONFIG.expandTime,
                        ease: 'power3.inOut',
                    },
                    0
                )
                .to(zoomEl, {
                    opacity: 0,
                    y: -16,
                    duration: CONFIG.dissolveTime,
                    ease: 'power1.in',
                })
                .call(() => router.push(href));
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

            // like the homepage: speed rises fast and settles slowly, and the bend follows it
            for (const axis of ['x', 'y'] as const) {
                const moved = reduceMotion ? 0 : (cam[axis] - prevCam[axis]) / f;
                const raw = Math.abs(moved);
                prevCam[axis] = cam[axis];
                flow[axis] += (moved - flow[axis]) * Math.min(1, 0.12 * f);
                mouse[axis] += (mouseTarget[axis] - mouse[axis]) * Math.min(1, CONFIG.mouseSmoothing * f);
                speed[axis] += (raw - speed[axis]) * (raw > speed[axis] ? 0.22 : 0.1);
                const want = CONFIG.bendBase + clamp(speed[axis] / 40, 0, 1) * CONFIG.bendSpeed;
                bend[axis] += (want - bend[axis]) * (want < bend[axis] ? 0.12 : 0.1);
            }
            const leadMax = CONFIG.depthMax * 380 * field.scale;
            const ry = vh * 1.1; // cylinder radius, as on the homepage
            const rx = vw * 1.1;

            const zTarget = drag.moved && drag.active && !reduceMotion ? CONFIG.dragZoom : 1;
            zoom += (zTarget - zoom) * Math.min(1, 0.12 * f);
            if (Math.abs(zoom - shownZoom) > 0.0005) {
                layer.style.transform = `scale(${zoom.toFixed(4)})`;
                shownZoom = zoom;
            }

            for (let i = 0; i < els.length; i++) {
                const c = field.cells[i];
                let x = wrapX(field, c.x, cam.x);
                let y = wrapY(field, c.y, cam.y);

                // depth: lead / lag with the movement, and shift with the mouse
                const dd = c.depth - 0.8;
                x += clamp(flow.x * dd * CONFIG.depthLead, -leadMax, leadMax) + mouse.x * CONFIG.mouseShift * c.depth;
                y += clamp(flow.y * dd * CONFIG.depthLead, -leadMax, leadMax) + mouse.y * CONFIG.mouseShift * c.depth;

                if (burst.v) {
                    const dx = x + c.w / 2 - burst.x;
                    const dy = y + c.h / 2 - burst.y;
                    const d = Math.hypot(dx, dy) || 1;
                    const push = burst.v * CONFIG.scatter * field.scale;
                    x += (dx / d) * push;
                    y += (dy / d) * push;
                }

                // Wrap the photo onto the cylinders (the homepage's vertex shader, per photo): the
                // further it is from the middle, the more it curves round and away, and it turns
                // to face along the curve.
                const oy = y + c.h / 2 - vh / 2;
                const ox = x + c.w / 2 - vw / 2;
                const a = clamp(oy / ry, -1.45, 1.45);
                const b = clamp(ox / rx, -1.45, 1.45);
                y += (ry * Math.sin(a) - oy) * bend.y;
                x += (rx * Math.sin(b) - ox) * bend.x;
                const z = ry * (Math.cos(a) - 1) * bend.y + rx * (Math.cos(b) - 1) * bend.x;
                if (flat) {
                    // what the perspective would do: shrink toward the middle with distance,
                    // and foreshorten by the turn
                    const k = persp / (persp - z);
                    const px = vw / 2 + (x + c.w / 2 - vw / 2) * k - c.w / 2;
                    const py = vh / 2 + (y + c.h / 2 - vh / 2) * k - c.h / 2;
                    const sx = k * Math.cos(b * bend.x);
                    const sy = k * Math.cos(a * bend.y);
                    els[i].style.transform =
                        `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
                    continue;
                }
                els[i].style.transform =
                    `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) ` +
                    `rotateX(${(-a * bend.y).toFixed(4)}rad) rotateY(${(b * bend.x).toFixed(4)}rad)`;
            }
        };
        gsap.ticker.add(tick);

        return () => {
            gsap.ticker.remove(tick);
            leaveTl?.kill();
            zoomEl?.remove();
            openRef.current = null;
            window.removeEventListener('resize', onResize);
            root.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointermove', onMouse);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            root.removeEventListener('click', onClickCapture, true);
            root.removeEventListener('wheel', onWheel);
            window.removeEventListener('keydown', onKey);
            root.classList.remove('is-dragging', 'is-leaving');
            els.forEach((el) => el.classList.remove('is-chosen'));
        };
    }, [field, photos, router]);

    // Rules per album: while one of its photos is hovered, its other photos stay lit instead of
    // dimming with the rest (this beats the general hover dim rule in css below by specificity).
    const albumCss = albums
        .map(
            (_, i) =>
                `@media (hover: hover) {
                   .cv-root:not(.is-dragging):not(.is-leaving) .cv-layer:has(.cv-item[data-album="${i}"]:hover) .cv-item[data-album="${i}"] { opacity: 1; }
                 }`
        )
        .join('\n');

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
                                zIndex: Math.round(c.depth * 100), // nearer photos on top
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

            {/* not shown, but keeps a page heading for screen readers and search */}
            <h1 className="sr-only">photo vault: life through jackson zhou&apos;s lens</h1>

            <p className="cv-explore load-reveal" style={{ animationDelay: '0.45s' }} aria-hidden="true">
                explore
            </p>
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

  html.cv-leaving .cv-explore {
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
    /* the photos sit on a cylinder seen from the middle of the screen (see the frame loop);
       the perspective distance is set from the window size */
    perspective: 1000px;
    perspective-origin: 50% 50%;
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
    /* a clear outline makes the browser smooth the edges of tilted photos (no stair-steps) */
    outline: 1px solid transparent;
  }

  .cv-item:focus-visible {
    outline-color: currentColor;
    outline-offset: 2px;
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
    transition: opacity 0.5s ease;
  }

  /* the clicked photo is replaced by its moving copy (.cv-zoom) */
  .cv-root.is-leaving .cv-item.is-chosen {
    visibility: hidden;
  }

  .cv-zoom {
    position: absolute;
    z-index: 3;
    overflow: hidden;
    pointer-events: none;
    background: color-mix(in srgb, currentColor 6%, transparent);
    box-shadow: 0 30px 70px rgba(0, 0, 0, 0.18);
  }

  .cv-zoom img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cv-explore {
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(18px + env(safe-area-inset-bottom));
    z-index: 2;
    margin: 0;
    text-align: center;
    font-size: 13px;
    opacity: 0.55;
    pointer-events: none;
    text-shadow: 0 0 14px var(--background), 0 0 4px var(--background);
  }

  @media (max-width: 760px) {
    .cv-explore { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .cv-photo, .cv-img, .cv-cap { transition: none; }
  }
`;
