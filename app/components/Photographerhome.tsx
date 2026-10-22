'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import gsap from 'gsap';

interface PhotographerHomeProps {
    images?: string[];
    portrait?: string;
    name?: string;
    flipimage?: string;
}

interface HeroSlot {
    r: number;
    c: number;
    d: number;
    w: number;
}

interface Tile {
    el: HTMLElement;
    depth: number;
    mesh: THREE.Mesh;
    material: THREE.ShaderMaterial;
    imgAspect: number;
    sx: number;
    sy: number;
    rot: number;
    state: {
        p: number;
        a: number;
        fade: number; // mobile intro: 0 = invisible, 1 = fully faded in
        flip: number;
        direction: number;
    };
    ready: boolean;
    fadeStarted: boolean;
    flipCooldownUntil: number;
}

interface Word {
    el: HTMLElement;
    idx: number;
    docY: number;
}

const MOBILE_QUERY = '(max-width: 1000px)';

// Remembers that the intro has already played, so coming back to the homepage from another
// page of the site (client-side navigation) doesn't replay it. Also stored in sessionStorage
// so it survives full page loads within the same tab.
let introPlayed = false;
const INTRO_SEEN_KEY = 'pa-intro-seen';

const CONFIG = {
    baseBend: 0.18,
    velocityBend: 0.8,
    bendSmoothing: 0.1,
    mouseSmoothing: 0.06,
    tiltY: 0.25,
    tiltX: 0.2,
    mouseShift: 18,
    introDuration: 1.8,
    cameraDistance: 1000,
    photoSpeed: 1,
    textMaxBend: 0.3,
    nameRange: 1.2,
    flipDuration: 0.8,
    flipCooldown: 100,

    // Seconds before the final photo finishes spreading.
    // Increase this to unlock scrolling earlier.
    unlockLeadTime: 1.5,
    aboutGapPull: -1,
    aboutExtraGapVh: -0.32,

    // Mobile intro: each tile fades in over this many seconds, staggered by the gap below.
    mobileFadeDuration: 0.9,
    mobileFadeGap: 0.06,
} as const;

const HERO_SLOTS_DESKTOP: HeroSlot[] = [
    { r: 0, c: 4, d: 0.56, w: 88 },
    { r: 4, c: 1, d: 0.88, w: 86 },
    { r: 3, c: 6, d: 0.72, w: 84 },
    { r: 5, c: 8, d: 1.0, w: 80 },
    { r: 6, c: 3, d: 0.62, w: 84 },
    { r: 9, c: 2, d: 0.94, w: 82 },
    { r: 9, c: 6, d: 0.78, w: 84 },
    { r: 9, c: 8, d: 1.08, w: 80 },
    { r: 12, c: 4, d: 0.66, w: 90 },
    { r: 13, c: 1, d: 0.98, w: 84 },
    { r: 14, c: 8, d: 0.84, w: 82 },
    { r: 17, c: 5, d: 0.7, w: 88 },
    { r: 20, c: 2, d: 1.04, w: 84 },
    { r: 21, c: 6, d: 0.8, w: 88 },
    { r: 22, c: 8, d: 0.92, w: 82 },
];

const HERO_SLOTS_MOBILE: HeroSlot[] = [
    { r: 1, c: 2, d: 0.7, w: 0 },
    { r: 8, c: 1, d: 0.95, w: 0 },
    { r: 21, c: 2, d: 0.85, w: 0 },
    { r: 27, c: 1, d: 0.75, w: 0 },
    { r: 38, c: 2, d: 1.0, w: 0 },
    { r: 45, c: 1, d: 0.68, w: 0 },
    { r: 57, c: 2, d: 0.75, w: 0 },
    { r: 65, c: 1, d: 0.60, w: 0 },
    { r: 78, c: 2, d: 0.65, w: 0 },
    { r: 74, c: 1, d: 0.70, w: 0 },
];

const ABOUT_PARAGRAPHS = [
    "hi! i'm Jackson! a photographer, filmmaker, and creator based in toronto!",
    "lately i've been documenting my life through videos and photos! all of this started in 2023 when i first picked up photography using my dad's old camera.",
];

const VERTEX = /* glsl */ `
    uniform float uBend;
    uniform float uRadius;
    varying vec2 vUv;

    void main() {
        vUv = uv;

        vec4 wp = modelMatrix * vec4(position, 1.0);
        float a = clamp(wp.y / uRadius, -1.45, 1.45);

        wp.z += uRadius * (cos(a) - 1.0) * uBend;
        wp.y = mix(wp.y, uRadius * sin(a), uBend);

        gl_Position = projectionMatrix * viewMatrix * wp;
    }
`;

const FRAGMENT = /* glsl */ `
    uniform sampler2D uTexture;
    uniform sampler2D uBackTexture;
    uniform float uOpacity;
    uniform vec2 uRatio;
    uniform vec2 uBackRatio;

    varying vec2 vUv;

    void main() {
        vec4 tex;

        if (gl_FrontFacing) {
            vec2 uv = (vUv - 0.5) * uRatio + 0.5;
            tex = texture2D(uTexture, uv);
        } else {
            vec2 uv = (vUv - 0.5) * uBackRatio + 0.5;
            uv.x = 1.0 - uv.x;
            tex = texture2D(uBackTexture, uv);
        }

        gl_FragColor = vec4(tex.rgb, tex.a * uOpacity);

        #include <colorspace_fragment>
    }
`;

const clamp = (v: number, a: number, b: number) =>
    Math.min(b, Math.max(a, v));

const lerp = (a: number, b: number, t: number) =>
    a + (b - a) * t;

const easeInOut = (t: number) =>
    t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;

export default function PhotographerHome({
    images = [],
    portrait,
    name = 'jackson zhou.',
    flipimage,
}: PhotographerHomeProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const logoRef = useRef<HTMLDivElement>(null);
    const aboutRef = useRef<HTMLElement>(null);
    const portraitRef = useRef<HTMLDivElement>(null);

    const validImages = images.filter(Boolean);
    const portraitSrc = portrait ?? validImages.at(-1);

    const [isMobile, setIsMobile] = useState<boolean | null>(null);

    useEffect(() => {
        const mq = window.matchMedia(MOBILE_QUERY);

        setIsMobile(mq.matches);

        const onChange = (e: MediaQueryListEvent) => {
            setIsMobile(e.matches);
        };

        mq.addEventListener('change', onChange);

        return () => mq.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        if (isMobile === null) return;

        const root = rootRef.current;
        const canvas = canvasRef.current;
        const overlay = overlayRef.current;
        const logo = logoRef.current;
        const about = aboutRef.current;
        const portraitEl = portraitRef.current;

        if (
            !root ||
            !canvas ||
            !overlay ||
            !logo ||
            !about ||
            !portraitEl
        ) {
            return;
        }

        // ---------------------------------------------------------
        // SKIP THE INTRO IF THE VISITOR IS ALREADY "INSIDE" THE SITE
        // ---------------------------------------------------------

        const navEntry = performance.getEntriesByType('navigation')[0] as
            | PerformanceNavigationTiming
            | undefined;

        // a reload of the homepage always replays the intro
        const isFreshReload =
            navEntry?.type === 'reload' && performance.now() < 8000;

        let cameFromSite = false;

        try {
            cameFromSite =
                !!document.referrer &&
                new URL(document.referrer).origin === window.location.origin;
        } catch {
            cameFromSite = false;
        }

        let seenThisSession = false;

        try {
            seenThisSession = sessionStorage.getItem(INTRO_SEEN_KEY) === '1';
        } catch {
            seenThisSession = false;
        }

        const skipIntro =
            !isFreshReload &&
            (introPlayed || seenThisSession || cameFromSite);

        introPlayed = true;

        try {
            sessionStorage.setItem(INTRO_SEEN_KEY, '1');
        } catch {
            /* storage unavailable: fine */
        }

        // ---------------------------------------------------------
        // SCROLL LOCK
        // ---------------------------------------------------------

        const html = document.documentElement;
        const body = document.body;

        const savedScrollX = window.scrollX;
        const savedScrollY = window.scrollY;

        const previousHtmlOverflow = html.style.overflow;
        const previousHtmlOverscroll = html.style.overscrollBehavior;
        const previousBodyOverflow = body.style.overflow;
        const previousBodyPosition = body.style.position;
        const previousBodyTop = body.style.top;
        const previousBodyLeft = body.style.left;
        const previousBodyRight = body.style.right;
        const previousBodyWidth = body.style.width;
        const previousBodyOverscroll = body.style.overscrollBehavior;

        let scrollLocked = false;

        const lockScroll = () => {
            if (scrollLocked) return;

            scrollLocked = true;

            html.style.overflow = 'hidden';
            html.style.overscrollBehavior = 'none';

            body.style.overflow = 'hidden';
            body.style.overscrollBehavior = 'none';
            body.style.position = 'fixed';
            body.style.top = `-${savedScrollY}px`;
            body.style.left = `-${savedScrollX}px`;
            body.style.right = '0';
            body.style.width = '100%';
        };

        const unlockScroll = () => {
            if (!scrollLocked) return;

            scrollLocked = false;

            html.style.overflow = previousHtmlOverflow;
            html.style.overscrollBehavior = previousHtmlOverscroll;

            body.style.overflow = previousBodyOverflow;
            body.style.position = previousBodyPosition;
            body.style.top = previousBodyTop;
            body.style.left = previousBodyLeft;
            body.style.right = previousBodyRight;
            body.style.width = previousBodyWidth;
            body.style.overscrollBehavior = previousBodyOverscroll;

            window.scrollTo(savedScrollX, savedScrollY);
        };

        if (!skipIntro) lockScroll();

        // While the intro plays, the site navbar (a separate component) is hidden via this class.
        // It is removed at the point in the timeline where the nav should fade in.
        if (!skipIntro) html.classList.add('pa-intro');

        const reduceMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        let vw = window.innerWidth;
        let vh = window.innerHeight;

        const D = CONFIG.cameraDistance;

        const renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
        });

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(vw, vh, false);
        renderer.setClearColor(0xffffff, 0);

        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(
            50,
            vw / vh,
            1,
            4000
        );

        const fitCamera = () => {
            camera.fov =
                (2 * Math.atan(vh / 2 / D) * 180) / Math.PI;

            camera.aspect = vw / vh;
            camera.position.set(0, 0, D);
            camera.updateProjectionMatrix();
        };

        fitCamera();

        const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);
        const loader = new THREE.TextureLoader();

        loader.setCrossOrigin('anonymous');

        const tileEls = Array.from(
            root.querySelectorAll<HTMLElement>('[data-tile]')
        );

        const tileImages = tileEls.map((_, i) =>
            validImages.length > 0
                ? validImages[i % validImages.length]
                : undefined
        );

        let cancelled = false;

        // ---------------------------------------------------------
        // MOBILE INTRO: tiles simply fade in (no stacking / spreading)
        // ---------------------------------------------------------

        // Becomes true once the overlay starts lifting. A tile whose image is ready by then fades in
        // right away; a tile whose image arrives later fades in the moment it is ready (no pop-in).
        let introReleased = false;

        const fadeTile = (t: Tile, i: number) => {
            if (t.fadeStarted) return;

            t.fadeStarted = true;

            gsap.to(t.state, {
                fade: 1,
                duration: reduceMotion ? 0.01 : CONFIG.mobileFadeDuration,
                delay: reduceMotion ? 0 : i * CONFIG.mobileFadeGap,
                ease: 'power2.out',
            });
        };

        const mobileFade = isMobile && !skipIntro;

        const tiles: Tile[] = tileEls.map((el, i) => {
            const depth = parseFloat(el.dataset.depth ?? '1');
            const url = tileImages[i];

            const material = new THREE.ShaderMaterial({
                vertexShader: VERTEX,
                fragmentShader: FRAGMENT,
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide,
                uniforms: {
                    uTexture: { value: null },
                    uBackTexture: { value: null },
                    uOpacity: { value: 1 },
                    uBend: { value: CONFIG.baseBend },
                    uRadius: { value: vh },
                    uRatio: {
                        value: new THREE.Vector2(1, 1),
                    },
                    uBackRatio: {
                        value: new THREE.Vector2(1, 1),
                    },
                },
            });

            const tile: Tile = {
                el,
                depth,
                mesh: new THREE.Mesh(geometry, material),
                material,
                imgAspect: 3 / 4,
                sx: 0,
                sy: 0,
                rot: (Math.random() - 0.5) * 0.6,
                state: {
                    // on mobile the tiles start (and stay) in their final spots
                    p: skipIntro || isMobile ? 1 : 0,
                    a: skipIntro || isMobile ? 1 : 0,
                    fade: mobileFade ? 0 : 1,
                    flip: 0,
                    direction: 1,
                },
                ready: false,
                fadeStarted: false,
                flipCooldownUntil: 0,
            };

            tile.mesh.renderOrder = i;
            tile.mesh.visible = false;

            scene.add(tile.mesh);

            if (url) {
                loader.load(
                    url,
                    (tex) => {
                        if (cancelled) {
                            tex.dispose();
                            return;
                        }

                        tex.colorSpace = THREE.SRGBColorSpace;

                        tex.anisotropy =
                            renderer.capabilities.getMaxAnisotropy();

                        material.uniforms.uTexture.value = tex;

                        const img = tex.image as
                            | { width?: number; height?: number }
                            | undefined;

                        if (img?.width && img?.height) {
                            tile.imgAspect = img.width / img.height;
                        }

                        tile.ready = true;

                        if (mobileFade && introReleased) fadeTile(tile, i);
                    },
                    undefined,
                    () => {
                        console.warn(
                            `[PhotographerHome] Failed to load image: ${url}`
                        );
                    }
                );
            }

            return tile;
        });

        let flipTexture: THREE.Texture | null = null;
        let flipAspect = 1;

        if (flipimage) {
            loader.load(
                flipimage,
                (tex) => {
                    if (cancelled) {
                        tex.dispose();
                        return;
                    }

                    tex.colorSpace = THREE.SRGBColorSpace;

                    tex.anisotropy =
                        renderer.capabilities.getMaxAnisotropy();

                    flipTexture = tex;

                    const img = tex.image as
                        | { width?: number; height?: number }
                        | undefined;

                    if (img?.width && img?.height) {
                        flipAspect = img.width / img.height;
                    }

                    tiles.forEach((t) => {
                        t.material.uniforms.uBackTexture.value = tex;
                    });
                },
                undefined,
                () => {
                    console.warn(
                        `[PhotographerHome] Failed to load flip image: ${flipimage}`
                    );
                }
            );
        }

        const words: Word[] = Array.from(
            about.querySelectorAll<HTMLElement>('[data-word]')
        ).map((el, idx) => ({
            el,
            idx,
            docY: 0,
        }));

        // Where the name should stop: the vertical centre of the site navbar (falls back to 28px).
        let navCenterY = 28;
        const measureNav = () => {
            const navEl = document.querySelector<HTMLElement>('[data-site-nav]');
            if (!navEl) return;
            const r = navEl.getBoundingClientRect();
            navCenterY = r.top + r.height / 2;
        };

        let measureFrame1 = 0;
        let measureFrame2 = 0;

        const fitGap = () => {
            about.style.marginTop = '0px';

            const scrollY = window.scrollY;
            let lastBottom = 0;

            tileEls.forEach((el) => {
                lastBottom = Math.max(
                    lastBottom,
                    el.getBoundingClientRect().bottom + scrollY
                );
            });

            const pr = portraitEl.getBoundingClientRect();
            const top = pr.top + scrollY;

            const centred = Math.max(
                0,
                top + pr.height / 2 - vh / 2
            );

            const gap =
                top -
                centred -
                (lastBottom - CONFIG.photoSpeed * centred);

            const pull =
                gap > 0 ? (-CONFIG.aboutGapPull * gap) / CONFIG.photoSpeed : 0;

            about.style.marginTop = `${pull + vh * CONFIG.aboutExtraGapVh}px`;
        };

        const measure = () => {
            if (cancelled) return;

            measureNav();
const fitGap = () => {
    about.style.marginTop = '0px';
};

            words.forEach((w) => {
                w.el.style.transform = 'none';
            });

            void about.offsetHeight;

            const scrollY = window.scrollY;

            words.forEach((w) => {
                const r = w.el.getBoundingClientRect();

                w.docY = r.top + scrollY + r.height / 2;
            });
        };

        measure();

        const remeasureAfterLayout = async () => {
            if (document.fonts?.ready) {
                await document.fonts.ready;
            }

            if (cancelled) return;

            measureFrame1 = requestAnimationFrame(() => {
                measureFrame2 = requestAnimationFrame(() => {
                    if (!cancelled) measure();
                });
            });
        };

        void remeasureAfterLayout();

        const onLoad = () => {
            if (!cancelled) measure();
        };

        window.addEventListener('load', onLoad);

        const target = { x: 0, y: 0 };
        const mouse = { x: 0, y: 0 };
        const pointer = { x: -9999, y: -9999 };

        let hoveredTile: Tile | null = null;

        const onPointerMove = (e: PointerEvent) => {
            target.x = (e.clientX / vw) * 2 - 1;
            target.y = -((e.clientY / vh) * 2 - 1);

            pointer.x = e.clientX;
            pointer.y = e.clientY;
        };

        const onPointerLeave = () => {
            pointer.x = -9999;
            pointer.y = -9999;
        };

        window.addEventListener('pointermove', onPointerMove, {
            passive: true,
        });

        window.addEventListener('pointerleave', onPointerLeave);

        let bend = CONFIG.baseBend;
        let smoothedVelocity = 0;
        let lastScrollY = window.scrollY;

        // true once the name has reached the navbar (tells the navbar to enable its click target)
        let wasDocked = false;
        const logoLink = logo.querySelector<HTMLAnchorElement>('a');

        let mobilePositionsBaked = false;

        const onResize = () => {
            // Phones fire "resize" whenever the address bar slides in or out while you scroll. That only
            // changes the height, so it must NOT re-run the layout work below; a real change of width
            // (rotation, window resize) does.
            const widthChanged = window.innerWidth !== vw;
            const heightDelta = Math.abs(window.innerHeight - vh);

            vw = window.innerWidth;
            vh = window.innerHeight;

            renderer.setSize(vw, vh, false);
            fitCamera();

            lastScrollY = window.scrollY;
            smoothedVelocity = 0;

            if (isMobile && !widthChanged && heightDelta < 150) return;

            if (widthChanged) {
                // new width = new layout, so the pushed-away positions are worked out again (once)
                mobilePositionsBaked = false;

                tiles.forEach((t) => {
                    t.sx = 0;
                    t.sy = 0;
                });
            }

            measure();
        };

        window.addEventListener('resize', onResize);

        // Works out where each mobile tile sits, pushing away any tile that would cover the name.
        // It is computed ONCE, as if the page were at the very top with the name in the centre of the
        // screen, and then left alone: it does not depend on the current scroll position or on where
        // the name currently is, so scrolling (or the address bar resizing) can never move the tiles.
        const bakeMobilePositions = () => {
            if (!isMobile || mobilePositionsBaked) return;

            // The name's natural size (offsetWidth/Height ignore the scale/translate we animate),
            // centred on the screen, where it sits before any scrolling.
            const lw = logo.offsetWidth;
            const lh = logo.offsetHeight;

            const logoRect = {
                left: vw / 2 - lw / 2,
                right: vw / 2 + lw / 2,
                top: vh / 2 - lh / 2,
                bottom: vh / 2 + lh / 2,
            };

            const paddingX = 8;
            const paddingY = 12;
            const spreadTightness = 0.9;

            // while the intro locks the page, the body is shifted by -savedScrollY instead of scrolled
            const scrollNow = scrollLocked ? savedScrollY : window.scrollY;

            for (const t of tiles) {
                const r = t.el.getBoundingClientRect();

                // document-space centre of the tile = where it is when the page is scrolled to the top
                const docCenterX = r.left + r.width / 2;
                const docCenterY = r.top + scrollNow + r.height / 2;

                const gx = (docCenterX - vw / 2) * spreadTightness;

                const offY = docCenterY - vh / 2;

                // (no scroll-based parallax term: this is the scroll = 0 position)
                const gy = -(offY + offY * (1 - t.depth) * 0.12) * spreadTightness;

                const mw = r.width;
                const mh = r.height;

                const x = gx;
                const y = gy;

                const tileCenterX = vw / 2 + x;
                const tileCenterY = vh / 2 - y;

                const tileLeft = tileCenterX - mw / 2;
                const tileRight = tileCenterX + mw / 2;
                const tileTop = tileCenterY - mh / 2;
                const tileBottom = tileCenterY + mh / 2;

                const overlapsHorizontally =
                    tileRight > logoRect.left - paddingX &&
                    tileLeft < logoRect.right + paddingX;

                const overlapsVertically =
                    tileBottom > logoRect.top - paddingY &&
                    tileTop < logoRect.bottom + paddingY;

                let finalX = x;

                if (overlapsHorizontally && overlapsVertically) {
                    const leftX =
                        logoRect.left -
                        paddingX -
                        mw / 2 -
                        vw / 2;

                    const rightX =
                        logoRect.right +
                        paddingX +
                        mw / 2 -
                        vw / 2;

                    finalX =
                        Math.abs(tileCenterX - logoRect.left) <
                            Math.abs(tileCenterX - logoRect.right)
                            ? leftX
                            : rightX;
                }

                t.sx = finalX;
                t.sy = y;
            }

            mobilePositionsBaked = true;
        };

        const update = () => {
            if (cancelled) return;

            const scrollY = window.scrollY;

            mouse.x += (target.x - mouse.x) * CONFIG.mouseSmoothing;
            mouse.y += (target.y - mouse.y) * CONFIG.mouseSmoothing;

            const frameDelta = Math.min(
                Math.abs(scrollY - lastScrollY),
                60
            );

            lastScrollY = scrollY;

            const rawVelocity = reduceMotion ? 0 : frameDelta;

            const velocitySmoothing =
                rawVelocity > smoothedVelocity ? 0.22 : 0.1;

            smoothedVelocity +=
                (rawVelocity - smoothedVelocity) *
                velocitySmoothing;

            const targetBend = clamp(
                CONFIG.baseBend +
                clamp(smoothedVelocity / 40, 0, 1) *
                CONFIG.velocityBend,
                0,
                1
            );

            const bendSmoothing =
                targetBend < bend ? 0.12 : CONFIG.bendSmoothing;

            bend += (targetBend - bend) * bendSmoothing;

            const radius = vh * 1.1;

            if (isMobile && !mobilePositionsBaked) {
                bakeMobilePositions();
            }

            for (const t of tiles) {
                const r = t.el.getBoundingClientRect();
                const e = t.state.p;
                const a = t.state.a;

                const onScreen = isMobile
                    ? true
                    : e < 1 ||
                    (r.bottom > -vh * 0.6 &&
                        r.top < vh * 1.6);

                t.mesh.visible =
                    onScreen && t.ready && a > 0.001;

                if (!t.mesh.visible) continue;

                const offY = r.top + r.height / 2 - vh / 2;
                const spreadTightness = 0.9;

                const gx =
                    (r.left + r.width / 2 - vw / 2) *
                    spreadTightness;

                const parallaxStrength = 0.4;

                const scrollOffset =
                    scrollY * parallaxStrength * (t.depth - 0.8);

                const gy =
                    -(
                        offY + offY * (1 - t.depth) * 0.12
                    ) *
                    spreadTightness -
                    scrollOffset;

                const stackW = isMobile
                    ? vw * 0.72
                    : Math.min(vw * 0.28, 460, vh * 0.5);

                const stackH = (stackW * 4) / 3;
                const spreadScale = isMobile ? 1.0 : 1.4;

                const mw = lerp(stackW, r.width * spreadScale, e);
                const mh = lerp(stackH, r.height * spreadScale, e);

                const normalX =
                    lerp(t.sx, gx, e) +
                    mouse.x * CONFIG.mouseShift * t.depth * e;

                const fall = (1 - a) * (vh / 2 + stackH);

                const normalY =
                    lerp(t.sy, gy, e) +
                    mouse.y * CONFIG.mouseShift * t.depth * e +
                    fall;

                const finalX = isMobile
                    ? lerp(0, t.sx, e) +
                    mouse.x * CONFIG.mouseShift * t.depth * e
                    : normalX;

                const finalY = isMobile
                    ? lerp(0, gy, e) +
                    mouse.y * CONFIG.mouseShift * t.depth * e +
                    fall
                    : normalY;

                t.mesh.position.set(finalX, finalY, 0);
                t.mesh.scale.set(mw, mh, 1);

                const isFlipping = t.state.flip > 0.001;

                t.mesh.rotation.set(
                    -mouse.y * CONFIG.tiltX * t.depth * e,
                    (isFlipping
                        ? 0
                        : mouse.x * CONFIG.tiltY * t.depth * e) +
                    Math.PI * t.state.flip * t.state.direction,
                    t.rot * Math.sin(Math.PI * e)
                );

                const planeAspect = mw / mh;

                const ratio = t.material.uniforms
                    .uRatio.value as THREE.Vector2;

                if (t.imgAspect > planeAspect) {
                    ratio.set(planeAspect / t.imgAspect, 1);
                } else {
                    ratio.set(1, t.imgAspect / planeAspect);
                }

                const backRatio = t.material.uniforms
                    .uBackRatio.value as THREE.Vector2;

                if (flipAspect > planeAspect) {
                    backRatio.set(planeAspect / flipAspect, 1);
                } else {
                    backRatio.set(1, flipAspect / planeAspect);
                }

                t.material.uniforms.uOpacity.value = t.state.fade;
                t.material.uniforms.uBend.value = bend;
                t.material.uniforms.uRadius.value = radius;
            }

            if (flipTexture && !isMobile) {
                const getBounds = (t: Tile, padding = 0) => {
                    const cx = vw / 2 + t.mesh.position.x;
                    const cy = vh / 2 - t.mesh.position.y;

                    const halfW = Math.abs(t.mesh.scale.x) / 2;
                    const halfH = Math.abs(t.mesh.scale.y) / 2;

                    return {
                        left: cx - halfW - padding,
                        right: cx + halfW + padding,
                        top: cy - halfH - padding,
                        bottom: cy + halfH + padding,
                        cx,
                    };
                };

                const containsPointer = (
                    t: Tile,
                    padding = 0
                ) => {
                    if (!t.mesh.visible || !t.ready) return false;

                    const b = getBounds(t, padding);

                    return (
                        pointer.x >= b.left &&
                        pointer.x <= b.right &&
                        pointer.y >= b.top &&
                        pointer.y <= b.bottom
                    );
                };

                let nextHovered: Tile | null = null;

                if (
                    hoveredTile &&
                    containsPointer(hoveredTile, 14)
                ) {
                    nextHovered = hoveredTile;
                } else {
                    const candidates = [...tiles].sort(
                        (a, b) =>
                            b.mesh.renderOrder - a.mesh.renderOrder
                    );

                    nextHovered =
                        candidates.find(
                            (t) =>
                                t.state.p > 0.9 &&
                                containsPointer(t)
                        ) ?? null;
                }

                if (nextHovered !== hoveredTile) {
                    const previous = hoveredTile;
                    hoveredTile = nextHovered;

                    if (previous) {
                        gsap.killTweensOf(previous.state, 'flip');

                        gsap.to(previous.state, {
                            flip: 0,
                            duration: CONFIG.flipDuration,
                            ease: 'power3.inOut',
                            overwrite: true,
                            onComplete: () => {
                                if (cancelled) return;

                                previous.flipCooldownUntil =
                                    performance.now() +
                                    CONFIG.flipCooldown;
                            },
                        });
                    }

                    if (nextHovered) {
                        const selected = nextHovered;
                        const bounds = getBounds(selected);

                        selected.state.direction =
                            pointer.x < bounds.cx ? -1 : 1;

                        gsap.killTweensOf(selected.state, 'flip');

                        gsap.to(selected.state, {
                            flip: 1,
                            duration: CONFIG.flipDuration,
                            ease: 'power3.inOut',
                            overwrite: true,
                        });
                    }

                    canvas.style.cursor = nextHovered
                        ? 'pointer'
                        : '';
                }
            }

            renderer.render(scene, camera);

            const p = easeInOut(
                clamp(scrollY / (vh * CONFIG.nameRange), 0, 1)
            );

            // Tell the navbar when the name has reached it, so its (invisible) click target
            // sitting on top of the name can switch on.
            const docked = p > 0.985;

            if (docked !== wasDocked) {
                wasDocked = docked;
                html.classList.toggle('pa-docked', docked);

                // keyboard users can only reach the link once it is clickable too
                if (logoLink) logoLink.tabIndex = docked ? 0 : -1;
            }

            const dy = lerp(0, -(vh / 2 - navCenterY), p);
            const endScale = isMobile ? 0.54 : 0.42; // 36px * 0.42 ≈ 15px, 26px * 0.54 ≈ 14px
            const s = lerp(1, endScale, p);

            logo.style.transform =
                `translate(-50%, -50%) translate3d(0, ${dy}px, 0) scale(${s})`;

            for (const w of words) {
                const yv = w.docY - scrollY - vh / 2;

                if (yv > vh * 1.2 || yv < -vh * 1.2) {
                    w.el.style.opacity = yv > 0 ? '0' : '1';
                    continue;
                }

                const k = clamp(
                    bend * 1.1,
                    0,
                    CONFIG.textMaxBend
                );

                const a = clamp(yv / radius, -1.3, 1.3);

                const shiftY =
                    lerp(yv, radius * Math.sin(a), k) - yv;

                const shiftZ =
                    radius * (Math.cos(a) - 1) * k;

                const revealStart = vh * 0.75;
                const revealDistance = vh * 0.45;

                const reveal = clamp(
                    (revealStart - yv - w.idx * 2) /
                    revealDistance,
                    0,
                    1
                );

                w.el.style.opacity = String(reveal);

                w.el.style.transform =
                    `perspective(1000px) translate3d(0, ${shiftY + (1 - reveal) * 22}px, ${shiftZ}px) rotateX(${-a * k}rad)`;
            }
        };

        gsap.ticker.add(update);

        // ---------------------------------------------------------
        // INTRO TIMELINE
        // ---------------------------------------------------------

        const tl = gsap.timeline({
            delay: isMobile ? 0.1 : 0.4,
        });

        if (skipIntro) {
            // Coming from another page of the site: no intro. Go straight to the final layout.
            overlay.style.display = 'none';

            tl.fromTo(
                canvas,
                { opacity: 0 },
                { opacity: 1, duration: 0.6, ease: 'power2.out' }
            );

            tl.add(() => {
                measure();
                lastScrollY = window.scrollY;
            }, 0.2);
        } else {
            tl.to(overlay, {
                opacity: 0,
                duration: 0.6,
                ease: 'power2.out',
                onComplete: () => {
                    overlay.style.display = 'none';
                },
            });

            if (isMobile) {
                // Phones: no stacking or spreading. The tiles are already in their final spots and just
                // fade in; the navbar appears and scrolling unlocks almost immediately.
                tl.add(() => html.classList.remove('pa-intro'), 0.3);

                tl.add(() => {
                    introReleased = true;

                    tiles.forEach((t, i) => {
                        if (t.ready) fadeTile(t, i);
                    });

                    measure();
                    lastScrollY = window.scrollY;
                }, 0.3);

                tl.call(
                    () => {
                        unlockScroll();
                        measure();
                        lastScrollY = window.scrollY;
                    },
                    [],
                    0.6
                );
            } else {
                const appearGap = reduceMotion ? 0.01 : 0.16;
                const appearDur = reduceMotion ? 0.01 : 0.7;
                const appearStart = 0.9;

                tiles.forEach((t, i) => {
                    tl.to(
                        t.state,
                        {
                            a: 1,
                            duration: appearDur,
                            ease: 'power3.out',
                        },
                        appearStart + i * appearGap
                    );
                });

                const spreadStart =
                    appearStart +
                    tiles.length * appearGap +
                    appearDur +
                    0.3;

                const START = Math.PI / 4;
                const TAU = Math.PI * 2;

                const order = tiles
                    .map((t) => {
                        const r = t.el.getBoundingClientRect();

                        const dx =
                            r.left + r.width / 2 - vw / 2;

                        const dy =
                            r.top + r.height / 2 - vh / 2;

                        const sweep =
                            (Math.atan2(dy, dx) - START + TAU) % TAU;

                        return { t, sweep };
                    })
                    .sort((m, n) => m.sweep - n.sweep);

                const spreadGap = 0.06;
                const spreadDuration = reduceMotion
                    ? 0.01
                    : CONFIG.introDuration;

                order.forEach(({ t }, i) => {
                    tl.to(
                        t.state,
                        {
                            p: 1,
                            duration: spreadDuration,
                            ease: 'expo.out',
                        },
                        spreadStart + i * spreadGap
                    );
                });

                // Schedule relative to the actual final desktop spread tween.
                const lastSpreadStart =
                    spreadStart +
                    Math.max(0, order.length - 1) * spreadGap;

                const lastSpreadEnd = lastSpreadStart + spreadDuration;
                const unlockAt = Math.max(
                    0,
                    lastSpreadEnd - CONFIG.unlockLeadTime
                );

                tl.call(
                    () => {
                        unlockScroll();
                        measure();
                        lastScrollY = window.scrollY;
                    },
                    [],
                    unlockAt
                );

                // reveal the site navbar
                tl.add(
                    () => html.classList.remove('pa-intro'),
                    spreadStart + 0.6
                );

                tl.add(() => {
                    measure();
                    lastScrollY = window.scrollY;
                }, spreadStart + 1.2);
            }
        }

        return () => {
            cancelled = true;

            // Always restore the page if the component unmounts or
            // the viewport breakpoint changes during the animation.
            unlockScroll();
            html.classList.remove('pa-intro');
            html.classList.remove('pa-docked');

            cancelAnimationFrame(measureFrame1);
            cancelAnimationFrame(measureFrame2);

            window.removeEventListener('load', onLoad);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerleave', onPointerLeave);
            window.removeEventListener('resize', onResize);

            tl.kill();
            gsap.ticker.remove(update);

            tiles.forEach((t) => {
                gsap.killTweensOf(t.state);

                const texture = t.material.uniforms
                    .uTexture.value as THREE.Texture | null;

                texture?.dispose();
                t.material.dispose();
            });

            flipTexture?.dispose();
            geometry.dispose();
            renderer.dispose();
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMobile]);

    const slots = isMobile
        ? HERO_SLOTS_MOBILE
        : HERO_SLOTS_DESKTOP;

    return (
        <div
            ref={rootRef}
            data-pa-home
            className={`pa-root${isMobile ? ' pa-m' : ''}`}
        >
            <style>{css}</style>

            <div
                ref={overlayRef}
                className="pa-overlay"
                aria-hidden="true"
            />

            <canvas
                key={isMobile ? 'm' : 'd'}
                ref={canvasRef}
                className="pa-canvas"
                aria-hidden="true"
            />

            <div ref={logoRef} className="pa-logo">
                <Link
                    href="/"
                    aria-label="Home"
                    tabIndex={-1}
                    className="pa-logo-link"
                    onClick={(e) => {
                        // already on the homepage: just scroll back to the top
                        if (window.location.pathname === '/') {
                            e.preventDefault();
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    }}
                >
                    {name}
                </Link>
            </div>

            <section className="pa-hero" aria-hidden="true">
                <div className="pa-grid">
                    {isMobile !== null &&
                        slots.map((s, i) => (
                            <div
                                key={`${isMobile ? 'm' : 'd'}-${i}`}
                                data-tile
                                data-depth={s.d}
                                className={`pa-tile ${s.c === 1
                                        ? 'pa-tile--l'
                                        : 'pa-tile--r'
                                    }`}
                                style={{
                                    gridRow: s.r,
                                    gridColumn: s.c,
                                    ...(isMobile
                                        ? {}
                                        : {
                                            width: `clamp(52px, ${Math.round(s.w * 0.85)}%, 225px)`,
                                        }),
                                }}
                            />
                        ))}
                </div>
            </section>

            <section ref={aboutRef} className="pa-about">
                <div
                    ref={portraitRef}
                    className="pa-portrait"
                    aria-hidden="true"
                >
                    {portraitSrc && (
                        <img
                            src={portraitSrc}
                            alt=""
                            decoding="async"
                            onLoad={(e) => {
                                e.currentTarget.style.opacity = '1';
                            }}
                            onError={() => {
                                console.error(
                                    'Portrait failed to load:',
                                    portraitSrc
                                );
                            }}
                            style={{
                                opacity: 1,
                            }}
                        />
                    )}
                </div>

                {ABOUT_PARAGRAPHS.map((para, pi) => (
                    <p key={pi} className="pa-about-text">
                        {para.split(' ').map((word, wi) => (
                            <span key={wi}>
                                <span
                                    data-word
                                    className="pa-word"
                                >
                                    {word}
                                </span>{' '}
                            </span>
                        ))}
                    </p>
                ))}
            </section>


        </div>
    );
}

const css = `
  .pa-root {
    position: relative;
    background: #fff;
    color: #33333d;
    font-family: "Neue Montreal", "Helvetica Neue", Helvetica, Arial, sans-serif;
    overflow-x: clip;
    overflow-anchor: none;
  }

  .pa-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: #fff;
  }

  .pa-canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    pointer-events: none;
    display: block;
  }

  .pa-logo {
    position: fixed;
    top: 50%;
    left: 50%;
    z-index: 0;
    transform: translate(-50%, -50%);
    font-size: 36px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: #000;
    white-space: nowrap;
    pointer-events: none;
    will-change: transform;
  }

  /* the name is not clickable until it has reached the top (the navbar): see html.pa-docked */
  .pa-logo-link {
    color: inherit;
    text-decoration: none;
    pointer-events: none;
  }
  html.pa-docked .pa-logo-link {
    pointer-events: auto;
    cursor: pointer;
  }

.pa-hero {
    position: relative;
    z-index: 2;
    width: 100%;
    min-height: 235vh;
    padding-bottom: 0;
    margin-bottom: 0;
    pointer-events: none;
}

  .pa-grid {
    display: grid;
    width: 100%;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    grid-auto-rows: 10vh;
    padding: 2vh 0 80px;
  }

  .pa-tile {
    aspect-ratio: 3 / 4;
    align-self: start;
    min-width: 0;
  }

.pa-about {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    min-height: 100vh;
    box-sizing: border-box;

    margin: 0 auto;
    padding: 80px 0;

    width: min(980px, 48vw);
    text-align: center;
}

.pa-portrait {
    aspect-ratio: 4 / 5;
    width: clamp(180px, calc(300px - 8vw), 260px);
    min-width: 0;
    margin-bottom: 40px;
}

  .pa-portrait img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.5s ease;
  }

.pa-about-text {
  margin: 0 0 0.95em;
  font-size: clamp(22px, calc(32px - 1vw), 30px);
  line-height: 1.24;
  letter-spacing: -0.01em;
}

  .pa-word {
    display: inline-block;
    opacity: 0;
    will-change: transform, opacity;
  }

  @media (max-width: 1000px) {
.pa-m .pa-hero {
    min-height: 0;
    margin-bottom: 0;
    padding-bottom: 0;
}

    .pa-m .pa-grid {
      grid-template-columns: repeat(2, 50vw);
      grid-auto-rows: 5vw;
      padding: 5vh 0 calc(20vw + 4vh);
    }

    .pa-m .pa-tile {
      width: 27vw;
      justify-self: start;
    }

    .pa-m .pa-tile--l {
      margin-left: 10vw;
    }

    .pa-m .pa-tile--r {
      margin-left: 10vw;
    }

    .pa-m .pa-tile:nth-child(3n + 1) {
      translate: -4vw 0;
    }

    .pa-m .pa-tile:nth-child(3n + 2) {
      translate: 4vw 0;
    }

    .pa-m .pa-tile:nth-child(3n) {
      translate: 0 0;
    }

.pa-m .pa-about {
    width: 88vw;
    min-height: 100svh;
    padding: 60px 0;
}

.pa-m .pa-portrait {
    width: clamp(155px, 32vw, 220px);
    min-width: 0;
    margin-bottom: 32px;
}

.pa-m .pa-about-text {
  font-size: clamp(20px, calc(28px - 2vw), 24px);
}

    .pa-m .pa-logo {
      font-size: 26px;
    }
  }
`;
