'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import gsap from 'gsap';
import { albums } from '@/data/albums';
import { decodeToCanvas } from './decodeImage';

// An album index: big titles in a list, and a single WebGL "print" showing the cover of the
// album you're on.
//   desktop: the print trails the cursor, bends with its speed and morphs between covers.
//            Text crossing the print switches to light or dark depending on the photo.
//   phones:  the print sits in a panel pinned under the navbar; the album scrolling past
//            just below the panel is the active one.
//   click:   the print grows to fill the screen, then the album opens.

const items = albums.map((album, i) => ({
    title: album.title,
    subtitle: album.subtitle,
    image: `https://assets.jkzhou.ca/photos/${album.slug}/${album.cover}`,
    href: `/photos/${album.slug}`,
    number: String(albums.length - i).padStart(2, '0'),
}));

const DESKTOP_ASPECT = 4 / 5; // width / height of the floating print
const TOUCH_ASPECT = 4 / 3; // width / height of the pinned panel on phones

const CONFIG = {
    follow: 0.12, // how quickly the print catches up with the cursor
    velocityBend: 0.35,
    velocitySmoothing: 0.15,
    maxTilt: 0.12, // radians of roll from sideways speed
    morphDuration: 0.9,
    revealDuration: 0.6,
    openDuration: 0.8,
    lightPhoto: 0.55, // average brightness above this counts as a light photo
} as const;

const TOUCH_QUERY = '(hover: none), (max-width: 760px)';

const subscribeTouch = (cb: () => void) => {
    const mq = window.matchMedia(TOUCH_QUERY);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
};
const getTouch = () => window.matchMedia(TOUCH_QUERY).matches;
const getTouchOnServer = () => null;

const VERTEX = /* glsl */ `
    uniform vec2 uVel;      // speed, in print-sizes per frame
    uniform float uBendAmt; // 0 = flat
    varying vec2 vUv;

    void main() {
        vUv = uv;
        vec3 p = position;

        // the middle of the print lags behind its edges, like paper being dragged
        p.x -= uVel.x * sin(uv.y * 3.14159) * uBendAmt;
        p.y -= uVel.y * sin(uv.x * 3.14159) * uBendAmt;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
`;

const FRAGMENT = /* glsl */ `
    uniform sampler2D uTex0;
    uniform sampler2D uTex1;
    uniform vec2 uRatio0;
    uniform vec2 uRatio1;
    uniform float uProgress;
    uniform float uTime;
    uniform float uOpacity;
    uniform float uZoom;
    uniform vec2 uVel;

    varying vec2 vUv;

    vec2 cover(vec2 uv, vec2 ratio, float zoom) {
        return (uv - 0.5) * ratio / zoom + 0.5;
    }

    // tiny RGB split when the print moves fast
    vec4 sampleSplit(sampler2D tex, vec2 uv, vec2 shift) {
        vec4 g = texture2D(tex, uv);
        float r = texture2D(tex, uv + shift).r;
        float b = texture2D(tex, uv - shift).b;
        return vec4(r, g.g, b, g.a);
    }

    void main() {
        // a soft, slightly wavy diagonal wipe from the old cover to the new one
        float soft = 0.35;
        float w = vUv.x * 0.6 + (1.0 - vUv.y) * 0.4
                + 0.05 * sin(vUv.y * 9.0 + uTime * 1.5);
        float m = smoothstep(w, w + soft, uProgress * 1.45 - 0.05);

        vec2 shift = uVel * 0.02;

        // old cover pushes in as it leaves, new cover settles from a slight zoom
        vec4 a = sampleSplit(uTex0, cover(vUv, uRatio0, (1.0 + m * 0.1) * uZoom), shift);
        vec4 b = sampleSplit(uTex1, cover(vUv, uRatio1, (1.0 + (1.0 - m) * 0.15) * uZoom), shift);

        gl_FragColor = vec4(mix(a, b, m).rgb, uOpacity);

        #include <colorspace_fragment>
    }
`;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Average brightness (0 – 1) of an image, from a tiny downscaled copy.
function averageBrightness(src: CanvasImageSource) {
    try {
        const c = document.createElement('canvas');
        c.width = c.height = 16;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) return 0.5;
        ctx.drawImage(src, 0, 0, 16, 16);
        const d = ctx.getImageData(0, 0, 16, 16).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) {
            sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        }
        return sum / (256 * 255);
    } catch {
        return 0.5;
    }
}

function RowContent({ item }: { item: (typeof items)[number] }) {
    return (
        <>
            <span className="ix-num">{item.number}</span>
            <span className="ix-mask">
                <span className="ix-title">{item.title}</span>
            </span>
            <span className="ix-sub">{item.subtitle}</span>
            <span className="ix-go" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                    <path
                        d="M2.07102 11.3494L0.963068 10.2415L9.2017 1.98864H2.83807L2.85227 0.454545H11.8438V9.46023H10.2955L10.3097 3.09659L2.07102 11.3494Z"
                        fill="currentColor"
                    />
                </svg>
            </span>
        </>
    );
}

export default function PhotosShowcase() {
    const rootRef = useRef<HTMLElement>(null);
    const listRef = useRef<HTMLOListElement>(null);
    const overRef = useRef<HTMLOListElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null); // desktop: fixed, full screen
    const frameRef = useRef<HTMLDivElement>(null); // phones: the pinned panel
    const frameCanvasRef = useRef<HTMLCanvasElement>(null);
    const openRef = useRef<((index: number, href: string) => boolean) | null>(null);
    const router = useRouter();

    // null until we're in the browser
    const touch = useSyncExternalStore(subscribeTouch, getTouch, getTouchOnServer);

    useEffect(() => {
        if (touch === null) return;

        const root = rootRef.current;
        const list = listRef.current;
        const over = overRef.current;
        const frame = frameRef.current;
        const canvas = touch ? frameCanvasRef.current : canvasRef.current;

        if (!root || !list || !canvas) return;
        if (touch ? !frame : !over) return;

        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        } catch {
            return; // no WebGL: the index still works as a plain list of links
        }

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        const printAspect = touch ? TOUCH_ASPECT : DESKTOP_ASPECT;

        // the pinned panel on phones sits just under the (fixed) site navbar
        const nav = document.querySelector<HTMLElement>('[data-site-nav]');
        root.style.setProperty('--nav-h', `${nav?.offsetHeight ?? 52}px`);

        let cancelled = false;
        let vw = window.innerWidth;
        let vh = window.innerHeight;
        let cw = 1; // canvas size in css px
        let ch = 1;
        const D = 1000;

        renderer.setPixelRatio(pixelRatio);
        renderer.setClearColor(0xffffff, 0);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, 1, 1, 4000);

        const sizeCanvas = () => {
            vw = window.innerWidth;
            vh = window.innerHeight;

            if (touch && frame) {
                const r = frame.getBoundingClientRect();
                cw = Math.max(1, r.width);
                ch = Math.max(1, r.height);
            } else {
                cw = vw;
                ch = vh;
            }

            renderer.setSize(cw, ch, false);
            camera.fov = (2 * Math.atan(ch / 2 / D) * 180) / Math.PI; // 1 unit = 1 css px
            camera.aspect = cw / ch;
            camera.position.set(0, 0, D);
            camera.updateProjectionMatrix();
        };
        sizeCanvas();

        const material = new THREE.ShaderMaterial({
            vertexShader: VERTEX,
            fragmentShader: FRAGMENT,
            transparent: true,
            depthWrite: false,
            uniforms: {
                uTex0: { value: null },
                uTex1: { value: null },
                uRatio0: { value: new THREE.Vector2(1, 1) },
                uRatio1: { value: new THREE.Vector2(1, 1) },
                uProgress: { value: 1 },
                uTime: { value: 0 },
                uOpacity: { value: 0 },
                uZoom: { value: 1 },
                uBendAmt: { value: touch ? 0 : CONFIG.velocityBend },
                uVel: { value: new THREE.Vector2(0, 0) },
            },
        });

        const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);
        const print = new THREE.Mesh(geometry, material);
        print.visible = false;
        scene.add(print);

        renderer.compile(scene, camera);

        const rows = Array.from(list.querySelectorAll<HTMLElement>('[data-row]'));
        const overRows = over
            ? Array.from(over.querySelectorAll<HTMLElement>('[data-row]'))
            : [];

        // every row exists twice on desktop (normal text + contrast copy over the photo)
        const forRow = (i: number, fn: (el: HTMLElement) => void) => {
            if (rows[i]) fn(rows[i]);
            if (overRows[i]) fn(overRows[i]);
        };

        // ---------------------------------------------------------
        // TEXTURES (all covers, loaded in the background)
        // ---------------------------------------------------------

        const textures: (THREE.Texture | null)[] = items.map(() => null);
        const ratios = items.map(() => new THREE.Vector2(1, 1));
        const brightness = items.map(() => 0.5);

        // desktop: big enough to still look sharp when the print fills the screen on click
        const maxSide = touch
            ? Math.min(1400, Math.ceil(700 * pixelRatio))
            : Math.min(2048, Math.ceil(Math.max(vw, vh) * pixelRatio * 0.75));

        const coverRatio = (imgAspect: number, out: THREE.Vector2) => {
            if (imgAspect > printAspect) out.set(printAspect / imgAspect, 1);
            else out.set(1, imgAspect / printAspect);
        };

        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');

        const onTexture = (
            i: number,
            tex: THREE.Texture,
            w: number,
            h: number,
            source: CanvasImageSource | null
        ) => {
            if (cancelled) {
                tex.dispose();
                return;
            }
            tex.colorSpace = THREE.SRGBColorSpace;
            renderer.initTexture(tex);
            textures[i] = tex;
            if (w && h) coverRatio(w / h, ratios[i]);
            if (source) brightness[i] = averageBrightness(source);
            if (pending === i) showCover(i);
        };

        // load in list order, two at a time, so the first covers arrive first
        const queue = items.map((_, i) => i);
        const loadNext = () => {
            const i = queue.shift();
            if (i === undefined || cancelled) return;
            const url = items[i].image;

            const fallback = () =>
                loader.load(
                    url,
                    (tex) => {
                        const img = tex.image as HTMLImageElement | undefined;
                        onTexture(i, tex, img?.width ?? 0, img?.height ?? 0, img ?? null);
                        loadNext();
                    },
                    undefined,
                    () => {
                        console.warn(`[PhotosShowcase] Failed to load image: ${url}`);
                        loadNext();
                    }
                );

            if (typeof createImageBitmap !== 'function') {
                fallback();
                return;
            }

            decodeToCanvas(url, maxSide)
                .then(({ canvas: c, width, height }) => {
                    onTexture(i, new THREE.CanvasTexture(c), width, height, c);
                    loadNext();
                })
                .catch(fallback);
        };
        loadNext();
        loadNext();

        // ---------------------------------------------------------
        // WHICH COVER IS SHOWN
        // ---------------------------------------------------------

        const state = { reveal: 0, progress: 1, open: 0 };
        let shown = -1; // album on the print (the "new" side of a morph)
        let previous = -1; // album being morphed away from
        let active = -1; // album the visitor is on
        let pending = -1; // wanted, but its texture hasn't loaded yet
        let opening = false;

        const showCover = (i: number) => {
            const tex = textures[i];
            if (!tex) {
                pending = i;
                frame?.classList.add('is-loading');
                return;
            }
            pending = -1;
            frame?.classList.remove('is-loading');
            if (i === shown) return;

            const u = material.uniforms;

            if (shown === -1 || state.reveal < 0.05) {
                // nothing visible yet: just put it on (and fade in), no morph
                u.uTex0.value = tex;
                u.uTex1.value = tex;
                (u.uRatio0.value as THREE.Vector2).copy(ratios[i]);
                (u.uRatio1.value as THREE.Vector2).copy(ratios[i]);
                state.progress = 1;
                previous = i;

                if (shown === -1 && active >= 0) {
                    gsap.fromTo(
                        state,
                        { reveal: 0 },
                        { reveal: 1, duration: CONFIG.revealDuration, ease: 'power2.out' }
                    );
                }
            } else {
                // whatever is mostly showing now becomes the "old" cover
                const fromIdx = state.progress > 0.5 ? shown : previous;
                u.uTex0.value = textures[fromIdx];
                (u.uRatio0.value as THREE.Vector2).copy(ratios[fromIdx]);
                u.uTex1.value = tex;
                (u.uRatio1.value as THREE.Vector2).copy(ratios[i]);
                previous = fromIdx;

                gsap.killTweensOf(state, 'progress');
                state.progress = 0;
                gsap.to(state, {
                    progress: 1,
                    duration: reduceMotion ? 0.01 : CONFIG.morphDuration,
                    ease: 'power3.out',
                });
            }
            shown = i;
        };

        const setActive = (i: number) => {
            if (i === active || opening) return;

            if (active >= 0) forRow(active, (el) => el.classList.remove('is-active'));
            active = i;
            list.classList.toggle('has-active', i >= 0);
            over?.classList.toggle('has-active', i >= 0);

            if (i >= 0) {
                forRow(i, (el) => el.classList.add('is-active'));
                showCover(i);
            } else {
                pending = -1;
            }

            if (shown === -1 && i >= 0) return; // the first cover fades itself in

            gsap.to(state, {
                reveal: i >= 0 ? 1 : 0,
                duration: reduceMotion ? 0.01 : CONFIG.revealDuration,
                ease: i >= 0 ? 'power3.out' : 'power2.in',
                overwrite: 'auto',
            });
        };

        // ---------------------------------------------------------
        // INPUT
        // ---------------------------------------------------------

        const pointer = { x: vw / 2, y: vh / 2, inside: false };
        const onPointerMove = (e: PointerEvent) => {
            if (e.pointerType === 'touch') return;
            pointer.x = e.clientX;
            pointer.y = e.clientY;
            pointer.inside = true;
        };
        const onPointerLeave = () => (pointer.inside = false);
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        document.documentElement.addEventListener('pointerleave', onPointerLeave);

        // desktop: canvas follows the window. phones: canvas follows the panel (whose size
        // doesn't change when the address bar slides in and out).
        const resizeObserver = new ResizeObserver(sizeCanvas);
        if (touch && frame) resizeObserver.observe(frame);
        else window.addEventListener('resize', sizeCanvas);

        // row titles slide up into view as the list scrolls in
        const rowObserver = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (!e.isIntersecting) continue;
                    const i = rows.indexOf(e.target as HTMLElement);
                    forRow(i, (el) => el.classList.add('is-in'));
                    rowObserver.unobserve(e.target);
                }
            },
            { rootMargin: '0px 0px -8% 0px' }
        );
        rows.forEach((r) => rowObserver.observe(r));

        let openCall: gsap.core.Tween | null = null;

        openRef.current = (index, href) => {
            if (opening || reduceMotion) return false;

            setActive(index);
            opening = true;
            forRow(index, (el) => el.classList.add('is-chosen'));
            document.documentElement.classList.add('ix-leaving');
            list.classList.add('is-opening');
            over?.classList.add('is-opening');

            if (touch && frame) {
                gsap.to(frame, { opacity: 0, duration: 0.3, delay: 0.08, ease: 'power2.out' });
            } else {
                gsap.to(state, { reveal: 0, duration: 0.3, delay: 0.08, ease: 'power2.out' });
            }

            router.prefetch(href);
            openCall = gsap.delayedCall(0.38, () => router.push(href));
            return true;
        };

        // ---------------------------------------------------------
        // FRAME LOOP
        // ---------------------------------------------------------

        const pos = { x: vw / 2, y: vh / 2 };
        const vel = { x: 0, y: 0 };
        let lastScrollY = window.scrollY;
        let overColor = '';
        let overHidden = false;

        const pickActiveDesktop = () => {
            if (!pointer.inside) return -1;
            const lr = list.getBoundingClientRect();
            if (
                pointer.y < lr.top ||
                pointer.y > lr.bottom ||
                pointer.x < lr.left ||
                pointer.x > lr.right
            ) {
                return -1;
            }
            let next = -1;
            rows.forEach((row, i) => {
                const r = row.getBoundingClientRect();
                if (pointer.y >= r.top && pointer.y < r.bottom) next = i;
            });
            return next;
        };

        const pickActiveTouch = () => {
            // the last row whose top has passed a "reading line" a little below the panel
            const fr = frame!.getBoundingClientRect();
            const line = fr.bottom + (window.innerHeight - fr.bottom) * 0.3;
            let next = 0;
            rows.forEach((row, i) => {
                if (row.getBoundingClientRect().top <= line) next = i;
            });
            return next;
        };

        const update = (time: number) => {
            if (cancelled) return;

            const scrollY = window.scrollY;
            const scrollDelta = scrollY - lastScrollY;
            lastScrollY = scrollY;

            if (!opening) setActive(touch ? pickActiveTouch() : pickActiveDesktop());

            const u = material.uniforms;
            const motion = reduceMotion ? 0 : 1;

            if (touch) {
                // ---- phones: the print simply fills the panel ----
                const rawVy = (-scrollDelta / ch) * motion;
                vel.x = 0;
                vel.y += (clamp(rawVy, -0.6, 0.6) - vel.y) * CONFIG.velocitySmoothing;

                print.position.set(0, 0, 0);
                print.scale.set(cw, ch, 1);
                print.rotation.set(0, 0, 0);

                (u.uVel.value as THREE.Vector2).set(0, -vel.y);
                u.uZoom.value = 1 + Math.min(Math.abs(vel.y), 0.5) * 0.2;
            } else {
                // ---- desktop: the print trails the cursor ----
                const baseW = clamp(vw * 0.22, 220, 400);

                // appear right where it's needed instead of flying in from somewhere else
                if (state.reveal < 0.02 && !opening) {
                    pos.x = pointer.x;
                    pos.y = pointer.y;
                }

                const prevX = pos.x;
                const prevY = pos.y;
                const follow = reduceMotion ? 1 : CONFIG.follow;
                pos.x += (pointer.x - pos.x) * follow;
                pos.y += (pointer.y - pos.y) * follow;

                const rawVx = ((pos.x - prevX) / baseW) * motion;
                const rawVy = ((pos.y - prevY) / baseW) * motion;
                vel.x += (clamp(rawVx, -0.6, 0.6) - vel.x) * CONFIG.velocitySmoothing;
                vel.y += (clamp(rawVy, -0.6, 0.6) - vel.y) * CONFIG.velocitySmoothing;

                // open animation: from the print to full screen
                const o = state.open;
                const coverW = Math.max(vw, vh * printAspect) * 1.04;
                const w = lerp(baseW, coverW, o) * lerp(0.8, 1, state.reveal);
                const h = w / printAspect;
                const cx = lerp(pos.x, vw / 2, o);
                const cy = lerp(pos.y, vh / 2, o);
                const calm = 1 - o;
                const rot = clamp(-vel.x * 1.2, -CONFIG.maxTilt, CONFIG.maxTilt) * calm;

                print.position.set(cx - vw / 2, vh / 2 - cy, 0);
                print.scale.set(w, h, 1);
                print.rotation.set(0, 0, rot);

                (u.uVel.value as THREE.Vector2).set(vel.x * calm, -vel.y * calm);
                u.uZoom.value = 1;

                // the contrast copy of the text is cut to the print's shape
                if (over) {
                    const visible = state.reveal > 0.002 && !!u.uTex1.value;

                    if (visible) {
                        const or = over.getBoundingClientRect();
                        const hw = w / 2;
                        const hh = h / 2;
                        const cos = Math.cos(rot);
                        const sin = Math.sin(rot);
                        const pts = [
                            [-hw, -hh],
                            [hw, -hh],
                            [hw, hh],
                            [-hw, hh],
                        ].map(([dx, dy]) => {
                            // rotate (screen y points down, so the angle flips)
                            const x = cx + dx * cos + dy * sin - or.left;
                            const y = cy - dx * sin + dy * cos - or.top;
                            return `${x.toFixed(1)}px ${y.toFixed(1)}px`;
                        });
                        over.style.clipPath = `polygon(${pts.join(',')})`;
                        over.style.opacity = String(state.reveal);
                        overHidden = false;
                    } else if (!overHidden) {
                        over.style.clipPath = 'polygon(0 0, 0 0, 0 0)';
                        overHidden = true;
                    }

                    // light text on dark photos, dark text on light photos
                    const onPhoto = state.progress > 0.5 ? shown : previous;
                    const color =
                        onPhoto >= 0 && brightness[onPhoto] > CONFIG.lightPhoto
                            ? '#0f0f15'
                            : '#ffffff';
                    if (color !== overColor) {
                        over.style.setProperty('--over', color);
                        overColor = color;
                    }
                }
            }

            u.uProgress.value = state.progress;
            u.uTime.value = time;
            u.uOpacity.value = state.reveal;

            print.visible = state.reveal > 0.002 && !!u.uTex1.value;

            if (print.visible) renderer.render(scene, camera);
            else renderer.clear();
        };

        gsap.ticker.add(update);

        return () => {
            cancelled = true;
            openRef.current = null;
            openCall?.kill();
            document.documentElement.classList.remove('ix-leaving');
            gsap.ticker.remove(update);
            gsap.killTweensOf(state);

            rowObserver.disconnect();
            resizeObserver.disconnect();
            window.removeEventListener('resize', sizeCanvas);
            window.removeEventListener('pointermove', onPointerMove);
            document.documentElement.removeEventListener('pointerleave', onPointerLeave);

            [list, over].forEach((l) => l?.classList.remove('has-active', 'is-opening'));
            rows.concat(overRows).forEach((r) => r.classList.remove('is-chosen'));
            rows.concat(overRows).forEach((r) => r.classList.remove('is-active', 'is-in'));
            if (over) {
                over.style.clipPath = '';
                over.style.opacity = '';
            }
            if (frame) {
                gsap.killTweensOf(frame);
                gsap.set(frame, { clearProps: 'transform,opacity' });
            }

            textures.forEach((t) => t?.dispose());
            material.dispose();
            geometry.dispose();
            renderer.dispose();
        };
    }, [touch, router]);

    const head = (
        <div className="ix-head">
            <span>photo vault</span>
        </div>
    );

    return (
        <section ref={rootRef} className="ix-root">
            <style>{css}</style>

            {touch === false && (
                <canvas ref={canvasRef} className="ix-canvas" aria-hidden="true" />
            )}

            {touch !== true && head}

            {touch === true && (
                <div className="ix-stage">
                    {head}
                    <div ref={frameRef} className="ix-frame is-loading">
                        <canvas ref={frameCanvasRef} aria-hidden="true" />
                    </div>
                </div>
            )}

            <div className="ix-lists">
                <ol ref={listRef} className="ix-list">
                    {items.map((item, i) => (
                        <li key={item.href} data-row className="ix-row">
                            <Link
                                href={item.href}
                                className="ix-link"
                                onPointerEnter={() => router.prefetch(item.href)}
                                onFocus={() => router.prefetch(item.href)}
                                onClick={(e) => {
                                    // cmd/ctrl/shift/middle-click still open a new tab as usual
                                    if (
                                        e.metaKey ||
                                        e.ctrlKey ||
                                        e.shiftKey ||
                                        e.altKey ||
                                        e.button !== 0
                                    )
                                        return;
                                    if (openRef.current?.(i, item.href)) e.preventDefault();
                                }}
                            >
                                <RowContent item={item} />
                            </Link>
                        </li>
                    ))}
                </ol>

                {/* desktop: the same text in the contrast colour, only visible over the photo */}
                {touch === false && (
                    <ol ref={overRef} className="ix-list ix-list--over" aria-hidden="true">
                        {items.map((item) => (
                            <li key={item.href} data-row className="ix-row">
                                <div className="ix-link">
                                    <RowContent item={item} />
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </section>
    );
}

const css = `
  .ix-root {
    --pad: clamp(16px, 4vw, 64px);
    position: relative;
    width: 100%;
    font-family: "Neue Montreal", "Helvetica Neue", Helvetica, Arial, sans-serif;
    padding: 6vh var(--pad) 18vh;
    box-sizing: border-box;
  }

  .ix-canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
    display: block;
  }

  .ix-head {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    max-width: 1400px;
    margin: 0 auto 2.5vh;
    font-size: 10px;
    font-weight: 600;
    line-height: 1.6;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .ix-lists {
    position: relative;
    z-index: 1;
    max-width: 1400px;
    margin: 0 auto;
  }

  .ix-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  /* the contrast copy, laid exactly over the real list and cut to the photo's shape */
  .ix-list--over {
    position: absolute;
    inset: 0;
    pointer-events: none;
    user-select: none;
    color: var(--over, #fff);
    clip-path: polygon(0 0, 0 0, 0 0);
    transition: color 0.35s ease;
  }

  .ix-row {
    border-top: 1px solid color-mix(in srgb, currentColor 14%, transparent);
    transition: opacity 0.5s ease;
  }

  .ix-row:last-child {
    border-bottom: 1px solid color-mix(in srgb, currentColor 14%, transparent);
  }

  .ix-list.has-active .ix-row:not(.is-active) {
    opacity: 0.28;
  }

  html.ix-leaving .bb-root,
  html.ix-leaving .ix-head,
  html.ix-leaving footer {
    opacity: 0 !important;
    transition: opacity 0.25s ease;
    pointer-events: none;
  }

  .ix-list.is-opening .ix-row {
    opacity: 0 !important;
    transition: opacity 0.25s ease;
  }

  .ix-list.is-opening .ix-row.is-chosen {
    transition: opacity 0.3s ease 0.08s;
  }

  .ix-link {
    display: grid;
    grid-template-columns: 3.2em 1fr auto;
    align-items: center;
    column-gap: 16px;
    padding: clamp(14px, 2.4vh, 26px) 0;
    color: inherit;
    text-decoration: none;
    opacity: 0;
    transition: opacity 1.2s ease;
  }

  .ix-row.is-in .ix-link {
    opacity: 1;
  }

  .ix-num {
    font-size: 13px;
    opacity: 0.6;
    font-variant-numeric: tabular-nums;
  }

  .ix-mask {
    display: block;
    overflow: hidden;
    font-size: clamp(34px, 6.4vw, 104px);
    padding: 0 0 0.22em;
    margin-bottom: -0.22em;
  }

  .ix-title {
    display: inline-block;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.02em;
    white-space: nowrap;
    transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .ix-row.is-in.is-active .ix-title {
    transform: translateX(0.35em);
  }

  .ix-sub {
    font-size: 14px;
    opacity: 0.6;
    text-align: right;
    max-width: 18em;
  }

  .ix-go {
    display: none;
  }

  /* ---- phones: pinned photo panel ---- */

  .ix-stage {
    position: sticky;
    top: 0;
    z-index: 2;
    margin: 0 calc(-1 * var(--pad)) 8px;
    padding: calc(var(--nav-h, 52px) + 8px) var(--pad) 14px;
    background: var(--background, #fff);
  }

  /* soft edge so rows fade in under the panel instead of being cut off */
  .ix-stage::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    height: 32px;
    background: linear-gradient(var(--background, #fff), transparent);
    pointer-events: none;
  }

  .ix-frame {
    position: relative;
    aspect-ratio: 4 / 3;
    max-width: 560px;
    margin: 0 auto;
    background: color-mix(in srgb, currentColor 5%, transparent);
    will-change: transform;
  }

  .ix-frame canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }

  .ix-frame::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      100deg,
      transparent 20%,
      color-mix(in srgb, currentColor 8%, transparent) 50%,
      transparent 80%
    );
    background-size: 220% 100%;
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  .ix-frame.is-loading::after {
    opacity: 1;
    animation: ix-shimmer 1.4s linear infinite;
  }

  @keyframes ix-shimmer {
    from { background-position: 120% 0; }
    to { background-position: -120% 0; }
  }

  @media (max-width: 760px) {
    .ix-root {
      padding-top: 0;
    }

    .ix-stage .ix-head {
      max-width: 560px;
      margin: 0 auto 10px;
    }

    .ix-link {
      grid-template-columns: auto 1fr auto;
      column-gap: 10px;
      row-gap: 6px;
      padding: 16px 0;
      -webkit-tap-highlight-color: transparent;
    }

    .ix-mask {
      grid-column: 1 / 3;
      grid-row: 1;
    }

    .ix-num {
      grid-column: 1;
      grid-row: 2;
    }

    .ix-sub {
      grid-column: 2;
      grid-row: 2;
      text-align: left;
      max-width: none;
    }

    .ix-mask {
      font-size: clamp(28px, 8.5vw, 44px);
    }

    .ix-title {
      white-space: normal;
    }

    .ix-row.is-in.is-active .ix-title {
      transform: none;
    }

    .ix-list.has-active .ix-row:not(.is-active) {
      opacity: 0.45;
    }

    .ix-go {
      grid-column: 3;
      grid-row: 1 / 3;
      align-self: center;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 999px;
      background: currentColor;
      opacity: 0;
      transform: scale(0.6);
      transition: opacity 0.35s ease, transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .ix-go svg {
      color: var(--background, #fff);
    }

    .ix-row.is-active .ix-go {
      opacity: 1;
      transform: scale(1);
    }

    .ix-link:active .ix-go {
      transform: scale(0.9);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ix-title { transform: none !important; transition: none; }
    .ix-link { opacity: 1; transition: none; }
    .ix-frame.is-loading::after { animation: none; }
    .ix-go { transition: none; }
  }
`;
