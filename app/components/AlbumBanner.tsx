'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';

export type BannerPhoto = { href: string; image: string };

function BannerImage({ src, priority }: { src: string; priority: boolean }) {
    const [loaded, setLoaded] = useState(false);

    return (
        <span className={`bb-photo${loaded ? ' is-loaded' : ''}`}>
            <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 760px) 60vw, 640px"
                className="object-cover"
                priority={priority}
                onLoad={() => setLoaded(true)}

                onError={() => setLoaded(true)}
            />
        </span>
    );
}

// seconds between each banner photo's reveal on load
const BANNER_STAGGER = 0.07;

const CONFIG = {
    baseSpeed: 45,
    scrollBoost: 0.45,
    maxSpeed: 1600,
    smoothing: 0.08,
} as const;

function BannerSet({
    photos,
    setRef,
}: {
    photos: BannerPhoto[];
    setRef?: React.Ref<HTMLDivElement>;
}) {
    return (
        <div ref={setRef} className="bb-set">
            {photos.map((item, i) => (
                <Link
                    key={item.image}
                    href={item.href}
                    tabIndex={-1}
                    draggable={false}

                    className={`bb-item media-reveal${i % 2 === 1 ? ' bb-item--wide' : ''}`}
                    // the shared photo reveal (globals.css), left to right
                    style={{ animationDelay: `${i * BANNER_STAGGER}s` }}
                >
                    <BannerImage src={item.image} priority={i < 4} />
                </Link>
            ))}
        </div>
    );
}

export default function AlbumBanner({ photos }: { photos: BannerPhoto[] }) {
    const rootRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const setRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const root = rootRef.current;
        const track = trackRef.current;
        const set = setRef.current;
        if (!root || !track || !set) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const measure = () => {
            const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
            return set.offsetWidth + gap;
        };
        let loopW = measure();
        const ro = new ResizeObserver(() => (loopW = measure()));
        ro.observe(set);

        let visible = true;
        const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
        io.observe(root);

        let hovering = false;
        const onEnter = (e: PointerEvent) => {
            if (e.pointerType === 'mouse') hovering = true;
        };
        const onLeave = () => (hovering = false);
        root.addEventListener('pointerenter', onEnter);
        root.addEventListener('pointerleave', onLeave);

        let x = 0;
        let speed: number = CONFIG.baseSpeed;
        let lastY = window.scrollY;

        const tick = (_time: number, deltaMs: number) => {
            const dt = Math.min(deltaMs, 50) / 1000;
            const y = window.scrollY;
            const dy = y - lastY;
            lastY = y;

            if (!visible || dt <= 0 || loopW <= 0) return;

            const target = hovering
                ? 0
                : Math.min(
                      CONFIG.baseSpeed + (Math.abs(dy) / dt) * CONFIG.scrollBoost,
                      CONFIG.maxSpeed
                  );
            speed += (target - speed) * CONFIG.smoothing;

            x -= speed * dt;
            if (x <= -loopW) x += loopW;
            if (x > 0) x -= loopW;

            track.style.transform = `translate3d(${x}px, 0, 0)`;
        };

        gsap.ticker.add(tick);

        return () => {
            gsap.ticker.remove(tick);
            ro.disconnect();
            io.disconnect();
            root.removeEventListener('pointerenter', onEnter);
            root.removeEventListener('pointerleave', onLeave);
        };
    }, []);

    return (
        <div ref={rootRef} className="bb-root" aria-hidden="true">
            <style>{css}</style>
            <div ref={trackRef} className="bb-track">
                <BannerSet photos={photos} setRef={setRef} />
                <BannerSet photos={photos} />
            </div>
        </div>
    );
}

const css = `
  .bb-root {
    --bb-h: clamp(220px, 40vh, 440px);
    --bb-gap: clamp(8px, 1vw, 16px);
    width: 100%;
    overflow: hidden;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    user-select: none;
    -webkit-user-select: none;
  }

  .bb-track,
  .bb-set {
    display: flex;
    column-gap: var(--bb-gap);
  }

  .bb-track {
    width: max-content;
    will-change: transform;
  }

  .bb-set {
    flex-shrink: 0;
  }

  .bb-item {
    display: block;
    flex-shrink: 0;
    color: inherit;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
  }

  .bb-photo {
    position: relative;
    display: block;
    height: var(--bb-h);
    aspect-ratio: 4 / 5;
    overflow: hidden;
    background: color-mix(in srgb, currentColor 6%, transparent);
  }

  .bb-item--wide .bb-photo {
    aspect-ratio: 3 / 2;
  }

  .bb-photo img {
    opacity: 0;
    transition:
      opacity 0.6s ease,
      transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .bb-photo.is-loaded img {
    opacity: 1;
  }

  .bb-item:hover .bb-photo img {
    transform: scale(1.04);
  }

  .bb-photo::after {
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
    animation: bb-shimmer 1.4s linear infinite;
    transition: opacity 0.5s ease;
    pointer-events: none;
  }

  .bb-photo.is-loaded::after {
    opacity: 0;
    animation: none;
  }

  @keyframes bb-shimmer {
    from { background-position: 120% 0; }
    to { background-position: -120% 0; }
  }

  @media (max-width: 760px) {
    .bb-root {
      --bb-h: clamp(170px, 30vh, 260px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bb-photo::after { animation: none; }
  }
`;
