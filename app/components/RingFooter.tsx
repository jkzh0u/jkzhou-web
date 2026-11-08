'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import gsap from 'gsap';
import { decodeToCanvas, textureUrl } from './imageTextures';

interface RingFooterProps {
    images?: string[];
    label?: string;
    href?: string;
}

const CONFIG = {
    // ring tilt: X tips the back of the ring up, Z raises the right side (like the sketch).
    // The ring is as flat as it can be while "contact me" still fits at full size in the
    // opening, somewhere between these two. Wide screens end up flat, narrow ones taller.
    tiltX: { flat: 0.32, steep: 0.62 },
    tiltZ: { flat: 0.1, steep: 0.2 },
    mouseTilt: 0.08,
    mouseSmoothing: 0.05,

    // radians / second. Negative = the front of the ring moves left -> right.
    baseSpeed: -0.14,
    hoverSpeed: -0.05,
    scrollBoost: 0.012,
    maxScrollBoost: 1.4,

    // back of the ring fades towards the background, like fog
    backOpacity: 0.45,

    introDuration: 2.4,
    introStagger: 0.07,
} as const;

const VERTEX = /* glsl */ `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const FRAGMENT = /* glsl */ `
    uniform sampler2D uTexture;
    uniform float uOpacity;
    uniform vec2 uRatio;

    varying vec2 vUv;

    void main() {
        vec2 uv = (vUv - 0.5) * uRatio + 0.5;
        vec4 tex = texture2D(uTexture, uv);

        gl_FragColor = vec4(tex.rgb, tex.a * uOpacity);

        #include <colorspace_fragment>
    }
`;

interface RingTile {
    mesh: THREE.Mesh;
    material: THREE.ShaderMaterial;
    imgAspect: number;
    size: number; // per-photo size variation
    ready: boolean;
    state: { fade: number };
    fadeStarted: boolean;
    z: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function RingFooter({
    images = [],
    label = 'contact me',
    href = '/contact',
}: RingFooterProps) {
    const rootRef = useRef<HTMLElement>(null);
    const backRef = useRef<HTMLCanvasElement>(null);
    const frontRef = useRef<HTMLCanvasElement>(null);
    const labelRef = useRef<HTMLAnchorElement>(null);

    const imagesKey = images.filter(Boolean).join('|');

    useEffect(() => {
        const root = rootRef.current;
        const backCanvas = backRef.current;
        const frontCanvas = frontRef.current;

        if (!root || !backCanvas || !frontCanvas) return;

        const urls = imagesKey ? imagesKey.split('|') : [];
        if (urls.length === 0) return;

        const reduceMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        let cancelled = false;
        let w = root.clientWidth;
        let h = root.clientHeight;

        // ---------------------------------------------------------
        // TWO RENDERERS, ONE SCENE
        // ---------------------------------------------------------
        // The back canvas sits under the "contact me" text and the front canvas over it.
        // Each frame the same scene is drawn twice: once with only the photos on the far
        // half of the ring, once with only the near half.

        const pixelRatio = Math.min(window.devicePixelRatio, 2);

        const makeRenderer = (canvas: HTMLCanvasElement) => {
            const r = new THREE.WebGLRenderer({
                canvas,
                alpha: true,
                antialias: true,
            });
            r.setPixelRatio(pixelRatio);
            r.setSize(w, h, false);
            r.setClearColor(0xffffff, 0);
            return r;
        };

        const backRenderer = makeRenderer(backCanvas);
        const frontRenderer = makeRenderer(frontCanvas);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, w / h, 1, 8000);

        let radius = 0;
        let tileW = 0;

        const MAX_TILE_SIZE = 1.15; // biggest per-photo size factor (see tile.size)
        const tileWFor = (R: number) => Math.min(Math.max(R * 0.26, 46), 110);
        const cameraDistFor = (R: number) => Math.max(1400, R * 3.6);

        // Where a photo at angle theta lands on screen: centre (x right, y up, px from the ring
        // centre), half size, and depth. Same maths as the frame loop, plus perspective.
        const project = (
            R: number,
            tw: number,
            D: number,
            a: number,
            b: number,
            theta: number
        ) => {
            const lx = R * Math.cos(theta);
            const lz = R * Math.sin(theta);
            const y1 = -lz * Math.sin(a);
            const z = lz * Math.cos(a);
            const x = lx * Math.cos(b) - y1 * Math.sin(b);
            const y = lx * Math.sin(b) + y1 * Math.cos(b);
            const k = D / (D - z);

            return {
                x: x * k,
                y: y * k,
                halfW: (tw / 2) * k,
                halfH: ((tw * 4) / 3 / 2) * k,
                z,
            };
        };

        // the ring's resting tilt (see CONFIG.tiltX); layout() picks it
        const tilt: { x: number; z: number } = { x: CONFIG.tiltX.flat, z: CONFIG.tiltZ.flat };
        // every tilt the mouse can push the ring to
        let tilts: { a: number; b: number }[] = [];

        // flatness: 1 = flattest ring, 0 = steepest
        const setTilt = (flatness: number) => {
            tilt.x = lerp(CONFIG.tiltX.steep, CONFIG.tiltX.flat, flatness);
            tilt.z = lerp(CONFIG.tiltZ.steep, CONFIG.tiltZ.flat, flatness);

            tilts = [-1, 1].flatMap((my) =>
                [-1, 1].map((mx) => ({
                    a: tilt.x - my * CONFIG.mouseTilt,
                    b: tilt.z + mx * CONFIG.mouseTilt * 0.6,
                }))
            );
        };
        const SAMPLES = 96;

        // The ring's on-screen bounding box (any photo, any angle, any mouse tilt).
        const ringBounds = (R: number) => {
            const tw = tileWFor(R) * MAX_TILE_SIZE;
            const D = cameraDistFor(R);
            let top = -Infinity;
            let bottom = Infinity;

            for (const { a, b } of tilts) {
                for (let i = 0; i < SAMPLES; i++) {
                    const p = project(R, tw, D, a, b, (i / SAMPLES) * Math.PI * 2);
                    top = Math.max(top, p.y + p.halfH);
                    bottom = Math.min(bottom, p.y - p.halfH);
                }
            }

            return { top, bottom };
        };

        const label = labelRef.current;

        // Biggest ring (at the current tilt) that fits the width and the screen height
        // (bisection: the ring's height grows with its radius).
        const fitRadius = (maxH: number) => {
            let lo = 0;
            // cap keeps the ring (and its photos) from getting huge on big screens
            let hi = Math.min(w * 0.42, 520);

            if (ringBounds(hi).top - ringBounds(hi).bottom <= maxH) return hi;

            for (let i = 0; i < 30; i++) {
                const mid = (lo + hi) / 2;
                const bb = ringBounds(mid);
                if (bb.top - bb.bottom > maxH) hi = mid;
                else lo = mid;
            }
            return lo;
        };

        // Where "contact me" can go at this font size, on a ring of radius R at the current
        // tilt, with no front photo (any angle, any mouse tilt) ever passing over it: the
        // centre of the ring's opening, or nudged at most 15% of the opening's height from
        // it. null if it doesn't fit.
        const labelSpot = (R: number, size: number, widthPerPx: number) => {
            const tw = tileWFor(R);
            const D = cameraDistFor(R);

            // the opening: between the bottom of the back photo and the top of the front one
            const back = project(R, tw, D, tilt.x, tilt.z, -Math.PI / 2);
            const front = project(R, tw, D, tilt.x, tilt.z, Math.PI / 2);
            const holeCentre = (back.y - back.halfH + front.y + front.halfH) / 2;
            const holeH = back.y - back.halfH - (front.y + front.halfH);

            const twMax = tw * MAX_TILE_SIZE;
            const margin = 6;
            const halfW = (widthPerPx * size) / 2 + margin;
            const halfH = (size * 0.8) / 2 + margin; // visible glyph height ≈ 0.8em

            const clear = (labelY: number) => {
                for (const { a, b } of tilts) {
                    for (let i = 0; i < SAMPLES; i++) {
                        const p = project(R, twMax, D, a, b, (i / SAMPLES) * Math.PI * 2);
                        if (p.z < 0) continue; // back photos are behind the text: fine

                        if (
                            Math.abs(p.x) < p.halfW + halfW &&
                            Math.abs(p.y - labelY) < p.halfH + halfH
                        ) {
                            return false;
                        }
                    }
                }
                return true;
            };

            const maxNudge = Math.max(0, holeH * 0.15);
            for (let dy = 0; dy <= maxNudge; dy += 2) {
                if (clear(holeCentre + dy)) return holeCentre + dy;
                if (clear(holeCentre - dy)) return holeCentre - dy;
            }
            return null;
        };

        const TILT_STEPS = 12;

        const layout = () => {
            w = root.clientWidth;
            const viewportH = window.innerHeight;

            // breathing room above and below the ring
            const pad = Math.round(Math.min(64, Math.max(28, w * 0.04)));
            const maxH = viewportH - pad * 2;

            // the label's full (CSS) size, and its width per px of font size
            let cssSize = 40;
            let widthPerPx = 5;
            if (label) {
                label.style.fontSize = '';
                cssSize = parseFloat(getComputedStyle(label).fontSize) || 40;
                widthPerPx = label.offsetWidth / cssSize;
            }

            // The flattest ring that still fits "contact me" at full size in its opening. Wide
            // screens stay flat and fill the width; narrower ones tip up only as much as needed.
            let labelY: number | null = null;
            for (let i = TILT_STEPS; i >= 0; i--) {
                setTilt(i / TILT_STEPS);
                radius = fitRadius(maxH);
                if (!label) break;

                labelY = labelSpot(radius, cssSize, widthPerPx);
                if (labelY !== null) break;
            }

            tileW = tileWFor(radius);
            const D = cameraDistFor(radius);

            // size the section to the ring, so the gap is the same on every screen
            const bounds = ringBounds(radius);
            h = Math.ceil(bounds.top - bounds.bottom + pad * 2);
            root.style.height = `${h}px`;

            backRenderer.setSize(w, h, false);
            frontRenderer.setSize(w, h, false);

            // Perspective makes the front half bigger and lower, so the ring's visual centre is
            // below its true centre. Shift the picture so the visual centre is in the middle.
            const centreY = (bounds.top + bounds.bottom) / 2;

            // 1 world unit = 1 css px on the ring's centre plane
            camera.fov = (2 * Math.atan(h / 2 / D) * 180) / Math.PI;
            camera.aspect = w / h;
            camera.position.set(0, 0, D);
            camera.near = 1;
            camera.far = D * 4;
            camera.setViewOffset(w, h, 0, -centreY, w, h);
            camera.updateProjectionMatrix();

            if (!label) return;

            // even the steepest ring is too tight: shrink the text until it fits
            let size = cssSize;
            while (labelY === null && size > 16) {
                size *= 0.97;
                labelY = labelSpot(radius, size, widthPerPx);
            }
            if (labelY === null) {
                const back = project(radius, tileW, D, tilt.x, tilt.z, -Math.PI / 2);
                const front = project(radius, tileW, D, tilt.x, tilt.z, Math.PI / 2);
                labelY = (back.y - back.halfH + front.y + front.halfH) / 2;
            }

            label.style.fontSize = `${size.toFixed(1)}px`;
            // screen y points down, and the picture was shifted by centreY
            label.style.transform = `translateY(${(-(labelY - centreY)).toFixed(1)}px)`;
        };

        layout();

        // the text's width is measured, so measure again once web fonts have loaded
        document.fonts?.ready.then(() => {
            if (!cancelled) layout();
        });

        const geometry = new THREE.PlaneGeometry(1, 1);

        const count = Math.min(Math.max(urls.length, 6), 12);

        const tiles: RingTile[] = Array.from({ length: count }, (_, i) => {
            const material = new THREE.ShaderMaterial({
                vertexShader: VERTEX,
                fragmentShader: FRAGMENT,
                transparent: true,
                depthWrite: false,
                depthTest: false,
                uniforms: {
                    uTexture: { value: null },
                    uOpacity: { value: 0 },
                    uRatio: { value: new THREE.Vector2(1, 1) },
                },
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.visible = false;
            scene.add(mesh);

            return {
                mesh,
                material,
                imgAspect: 3 / 4,
                size: 0.85 + ((i * 37) % 10) / 30, // 0.85 – 1.15, stable per index
                ready: false,
                state: { fade: reduceMotion ? 1 : 0 },
                fadeStarted: reduceMotion,
                z: 0,
            };
        });

        // compile once up front so the first visible frame doesn't hitch
        tiles.forEach((t) => (t.mesh.visible = true));
        backRenderer.compile(scene, camera);
        frontRenderer.compile(scene, camera);
        tiles.forEach((t) => (t.mesh.visible = false));

        // ---------------------------------------------------------
        // INTRO (plays the first time the footer scrolls into view)
        // ---------------------------------------------------------

        const intro = { p: reduceMotion ? 1 : 0 };
        let introStarted = reduceMotion;

        const fadeTile = (t: RingTile, i: number) => {
            if (t.fadeStarted) return;
            t.fadeStarted = true;

            gsap.to(t.state, {
                fade: 1,
                duration: 0.9,
                delay: introStarted && intro.p < 0.5 ? i * CONFIG.introStagger : 0,
                ease: 'power2.out',
            });
        };

        const startIntro = () => {
            if (introStarted) return;
            introStarted = true;

            gsap.to(intro, {
                p: 1,
                duration: CONFIG.introDuration,
                ease: 'expo.out',
            });

            tiles.forEach((t, i) => {
                if (t.ready) fadeTile(t, i);
            });
        };

        // ---------------------------------------------------------
        // LOADING (lazy: only once the footer is getting close)
        // ---------------------------------------------------------

        let loadingStarted = false;
        const maxSide = Math.min(1024, Math.ceil(400 * pixelRatio));
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');

        const onTexture = (
            t: RingTile,
            i: number,
            tex: THREE.Texture,
            iw: number,
            ih: number
        ) => {
            if (cancelled) {
                tex.dispose();
                return;
            }

            tex.colorSpace = THREE.SRGBColorSpace;
            backRenderer.initTexture(tex);
            frontRenderer.initTexture(tex);

            t.material.uniforms.uTexture.value = tex;
            if (iw && ih) t.imgAspect = iw / ih;
            t.ready = true;

            if (introStarted) fadeTile(t, i);
        };

        const startLoading = () => {
            if (loadingStarted) return;
            loadingStarted = true;

            tiles.forEach((t, i) => {
                const url = urls[i % urls.length];

                const fallback = () => {
                    if (cancelled) return;
                    loader.load(
                        url,
                        (tex) => {
                            const img = tex.image as
                                | { width?: number; height?: number }
                                | undefined;
                            onTexture(t, i, tex, img?.width ?? 0, img?.height ?? 0);
                        },
                        undefined,
                        () =>
                            console.warn(`[RingFooter] Failed to load image: ${url}`)
                    );
                };

                if (typeof createImageBitmap !== 'function') {
                    fallback();
                    return;
                }

                decodeToCanvas(textureUrl(url), maxSide)
                    .then(({ canvas, width, height }) =>
                        onTexture(t, i, new THREE.CanvasTexture(canvas), width, height)
                    )
                    .catch(fallback);
            });
        };

        // ---------------------------------------------------------
        // VISIBILITY: only animate while the footer is on screen
        // ---------------------------------------------------------

        let onScreen = false;

        const nearObserver = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) startLoading();
            },
            { rootMargin: '1000px 0px' }
        );
        nearObserver.observe(root);

        const visibleObserver = new IntersectionObserver(
            (entries) => {
                const e = entries[entries.length - 1];
                onScreen = e.isIntersecting;
                if (e.isIntersecting && e.intersectionRatio > 0.2) startIntro();
            },
            { threshold: [0, 0.2, 0.5] }
        );
        visibleObserver.observe(root);

        // ---------------------------------------------------------
        // INPUT
        // ---------------------------------------------------------

        const target = { x: 0, y: 0 };
        const mouse = { x: 0, y: 0 };
        let hovering = false;

        const onPointerMove = (e: PointerEvent) => {
            target.x = (e.clientX / window.innerWidth) * 2 - 1;
            target.y = -((e.clientY / window.innerHeight) * 2 - 1);
        };
        const onEnter = () => (hovering = true);
        const onLeave = () => (hovering = false);

        window.addEventListener('pointermove', onPointerMove, { passive: true });
        root.addEventListener('pointerenter', onEnter);
        root.addEventListener('pointerleave', onLeave);

        // layout() sets the section's height itself, so only re-run it when the width or the
        // window height actually changes (otherwise it would keep re-triggering itself).
        let lastW = w;
        let lastViewportH = window.innerHeight;

        const relayoutIfNeeded = () => {
            const vh = window.innerHeight;
            const widthChanged = root.clientWidth !== lastW;
            // phones resize the window whenever the address bar slides in/out; ignore that
            const heightChanged = Math.abs(vh - lastViewportH) > 150;

            if (!widthChanged && !heightChanged) return;

            lastW = root.clientWidth;
            lastViewportH = vh;
            layout();
        };

        const resizeObserver = new ResizeObserver(relayoutIfNeeded);
        resizeObserver.observe(root);
        window.addEventListener('resize', relayoutIfNeeded);

        // ---------------------------------------------------------
        // FRAME LOOP
        // ---------------------------------------------------------

        let angle = 0;
        let speed: number = CONFIG.baseSpeed;
        let lastScrollY = window.scrollY;
        let scrollVelocity = 0;
        const sorted = [...tiles];

        const update = (_time: number, deltaMs: number) => {
            if (cancelled) return;

            const scrollY = window.scrollY;
            const scrollDelta = Math.min(Math.abs(scrollY - lastScrollY), 80);
            lastScrollY = scrollY;

            if (!onScreen) return;

            const dt = Math.min(deltaMs / 1000, 0.05);

            scrollVelocity += (scrollDelta - scrollVelocity) * 0.12;

            const base: number = hovering ? CONFIG.hoverSpeed : CONFIG.baseSpeed;

            // scrolling spins the ring faster (in the same direction), then it eases back
            const boost = Math.min(
                scrollVelocity * CONFIG.scrollBoost,
                CONFIG.maxScrollBoost
            );

            const targetSpeed = reduceMotion
                ? CONFIG.baseSpeed * 0.3
                : base + Math.sign(base) * boost;

            speed += (targetSpeed - speed) * 0.05;
            angle += speed * dt;

            mouse.x += (target.x - mouse.x) * CONFIG.mouseSmoothing;
            mouse.y += (target.y - mouse.y) * CONFIG.mouseSmoothing;

            const a = tilt.x - mouse.y * CONFIG.mouseTilt;
            const b = tilt.z + mouse.x * CONFIG.mouseTilt * 0.6;
            const sinA = Math.sin(a);
            const cosA = Math.cos(a);
            const sinB = Math.sin(b);
            const cosB = Math.cos(b);

            const p = intro.p;
            const R = radius * lerp(0.12, 1, p);
            // spin in while the ring opens up
            const introSpin = (1 - p) * -2.2;

            tiles.forEach((t, i) => {
                const theta = angle + introSpin + (i / count) * Math.PI * 2;

                const lx = R * Math.cos(theta);
                const lz = R * Math.sin(theta);

                // tilt around X (back goes up), then around Z (right side goes up)
                const y1 = -lz * sinA;
                const z1 = lz * cosA;
                const x2 = lx * cosB - y1 * sinB;
                const y2 = lx * sinB + y1 * cosB;

                t.z = z1;

                const tw = tileW * t.size * lerp(0.6, 1, p);
                const th = (tw * 4) / 3;

                t.mesh.position.set(x2, y2, z1);
                t.mesh.scale.set(tw, th, 1);
                // photos always face the camera upright: no turning as they go around
                t.mesh.rotation.set(0, 0, 0);

                // cover-fit the photo into the 3:4 frame
                const planeAspect = tw / th;
                const ratio = t.material.uniforms.uRatio.value as THREE.Vector2;
                if (t.imgAspect > planeAspect) {
                    ratio.set(planeAspect / t.imgAspect, 1);
                } else {
                    ratio.set(1, t.imgAspect / planeAspect);
                }

                const front = (Math.sin(theta) + 1) / 2;
                t.material.uniforms.uOpacity.value =
                    t.state.fade * lerp(CONFIG.backOpacity, 1, front);
            });

            // far photos are drawn first so nearer ones sit on top
            sorted.sort((m, n) => m.z - n.z);
            sorted.forEach((t, i) => (t.mesh.renderOrder = i));

            const drawable = (t: RingTile) =>
                t.ready && t.state.fade > 0.001;

            for (const t of tiles) t.mesh.visible = drawable(t) && t.z < 0;
            backRenderer.render(scene, camera);

            for (const t of tiles) t.mesh.visible = drawable(t) && t.z >= 0;
            frontRenderer.render(scene, camera);
        };

        gsap.ticker.add(update);

        return () => {
            cancelled = true;

            gsap.ticker.remove(update);
            gsap.killTweensOf(intro);

            nearObserver.disconnect();
            visibleObserver.disconnect();
            resizeObserver.disconnect();
            window.removeEventListener('resize', relayoutIfNeeded);
            root.style.height = '';
            if (label) {
                label.style.fontSize = '';
                label.style.transform = '';
            }

            window.removeEventListener('pointermove', onPointerMove);
            root.removeEventListener('pointerenter', onEnter);
            root.removeEventListener('pointerleave', onLeave);

            tiles.forEach((t) => {
                gsap.killTweensOf(t.state);
                (t.material.uniforms.uTexture.value as THREE.Texture | null)?.dispose();
                t.material.dispose();
            });

            geometry.dispose();
            backRenderer.dispose();
            frontRenderer.dispose();
        };
    }, [imagesKey]);

    return (
        <section ref={rootRef} className="rf-root">
            <style>{css}</style>

            <canvas ref={backRef} className="rf-canvas rf-back" aria-hidden="true" />

            <Link ref={labelRef} href={href} className="rf-label">
                {label}
            </Link>

            <canvas ref={frontRef} className="rf-canvas rf-front" aria-hidden="true" />
        </section>
    );
}

const css = `
  .rf-root {
    position: relative;
    z-index: 2;
    isolation: isolate;
    width: 100%;
    /* placeholder until the ring sizes the section to fit itself */
    height: clamp(360px, 60vw + 120px, 900px);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .rf-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
  }

  .rf-back { z-index: 0; }
  .rf-front { z-index: 2; }

  .rf-label {
    position: relative;
    z-index: 1;
    font-family: "Neue Montreal", "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: clamp(28px, 4vw, 44px);
    font-weight: 600;
    letter-spacing: 0.02em;
    white-space: nowrap;
    color: inherit;
    text-decoration: none;
  }
`;
