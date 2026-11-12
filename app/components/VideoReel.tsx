'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
    ArrowUpRight,
    ChevronDown,
    ChevronUp,
    Loader2,
    Maximize,
    Play,
    Volume2,
    VolumeX,
} from 'lucide-react';

export interface ReelVideo {
    title: string;
    tag: string;
    year: string;
    src: string;
    poster: string;
    desc: string;

    aspectRatio?: number;
}

const INSTAGRAM = 'https://www.instagram.com/jkzhouu/';

const pad2 = (n: number) => String(n).padStart(2, '0');

type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };
type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void> };

export default function VideoReel({ videos }: { videos: ReelVideo[] }) {
    const total = videos.length;

    const wrapRef = useRef<HTMLDivElement>(null);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const slideRefs = useRef<(HTMLElement | null)[]>([]);
    const frameRefs = useRef<(HTMLDivElement | null)[]>([]);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const glowRefs = useRef<(HTMLCanvasElement | null)[]>([]);

    const [active, setActive] = useState(0);
    const [muted, setMuted] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [buffering, setBuffering] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    const activeRef = useRef(0);
    const mutedRef = useRef(true);
    const userPausedRef = useRef(false);
    const inViewRef = useRef(true);
    const reduceMotionRef = useRef(false);

    useEffect(() => {
        activeRef.current = active;
    }, [active]);

    useEffect(() => {
        mutedRef.current = muted;
        const v = videoRefs.current[activeRef.current];
        if (v) v.muted = muted;
    }, [muted]);

    useEffect(() => {
        reduceMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }, []);

    const go = useCallback(
        (i: number) => {
            const scroller = scrollerRef.current;
            const slide = slideRefs.current[Math.max(0, Math.min(total, i))];
            if (!scroller || !slide) return;
            scroller.scrollTo({
                top: slide.offsetTop,
                behavior: reduceMotionRef.current ? 'auto' : 'smooth',
            });
        },
        [total]
    );

    useEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;

        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (!e.isIntersecting || e.intersectionRatio < 0.6) continue;
                    const i = Number((e.target as HTMLElement).dataset.index);
                    if (i === activeRef.current) continue;
                    activeRef.current = i;
                    userPausedRef.current = false;
                    setActive(i);
                    setPlaying(false);
                    setBuffering(false);
                    if (i > 0) setScrolled(true);
                }
            },
            { root: scroller, threshold: [0.6] }
        );

        slideRefs.current.forEach((s) => s && io.observe(s));
        return () => io.disconnect();
    }, [total]);

    useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap) return;

        const io = new IntersectionObserver(
            ([e]) => {
                inViewRef.current = e.intersectionRatio > 0.5;
                const v = videoRefs.current[activeRef.current];
                if (!v) return;
                if (!inViewRef.current) v.pause();
                else if (!userPausedRef.current) v.play().catch(() => {});
            },
            { threshold: [0, 0.5, 1] }
        );

        io.observe(wrap);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        const html = document.documentElement;
        const scroller = scrollerRef.current;
        const locked = active < total && window.scrollY < 4;

        html.style.overflow = locked ? 'hidden' : '';
        if (scroller) scroller.style.overscrollBehaviorY = active < total ? 'contain' : 'auto';
    }, [active, total]);

    useEffect(() => {
        return () => {
            document.documentElement.style.overflow = '';
        };
    }, []);

    useEffect(() => {
        videoRefs.current.forEach((v, i) => {
            if (!v) return;

            if (i !== active) {
                v.pause();
                v.preload = i === active + 1 ? 'metadata' : 'none';
                return;
            }

            v.preload = 'auto';
            v.muted = mutedRef.current;

            if (!inViewRef.current) return;

            v.play().catch(() => {
                if (!v.muted) {
                    v.muted = true;
                    setMuted(true);
                    v.play().catch(() => {});
                }
            });
        });

        const v = videoRefs.current[active];
        if (!v) return;

        const onPlay = () => setPlaying(true);
        const onPause = () => {
            setPlaying(false);
            setBuffering(false);
        };
        const onWaiting = () => setBuffering(true);
        const onPlaying = () => {
            setBuffering(false);
            v.classList.add('is-started');
        };
        const onEnded = () => go(active + 1);

        v.addEventListener('play', onPlay);
        v.addEventListener('pause', onPause);
        v.addEventListener('waiting', onWaiting);
        v.addEventListener('playing', onPlaying);
        v.addEventListener('canplay', onPlaying);
        v.addEventListener('ended', onEnded);

        return () => {
            v.removeEventListener('play', onPlay);
            v.removeEventListener('pause', onPause);
            v.removeEventListener('waiting', onWaiting);
            v.removeEventListener('playing', onPlaying);
            v.removeEventListener('canplay', onPlaying);
            v.removeEventListener('ended', onEnded);
        };
    }, [active, go]);

    useEffect(() => {
        let raf = 0;
        let frame = 0;

        const loop = () => {
            const v = videoRefs.current[active];
            const fill = fillRefs.current[active];
            const glow = glowRefs.current[active];

            if (v && fill && v.duration) {
                fill.style.transform = `scaleX(${v.currentTime / v.duration})`;
            }

            if (v && glow && !v.paused && v.readyState >= 2 && frame++ % 4 === 0) {
                glow.getContext('2d')?.drawImage(v, 0, 0, glow.width, glow.height);
                glow.classList.add('is-on');
            }

            raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [active]);

    const togglePlay = useCallback((i: number) => {
        if (i !== activeRef.current) return;
        const v = videoRefs.current[i];
        if (!v) return;

        if (v.paused) {
            userPausedRef.current = false;
            v.play().catch(() => {});
        } else {
            userPausedRef.current = true;
            v.pause();
        }
    }, []);

    const toggleMute = useCallback(() => {
        setMuted((m) => {
            const next = !m;
            const v = videoRefs.current[activeRef.current];
            if (v) {
                v.muted = next;

                if (!next && v.paused) {
                    userPausedRef.current = false;
                    v.play().catch(() => {});
                }
            }
            return next;
        });
    }, []);

    const toggleFullscreen = useCallback((i: number) => {
        const frame = frameRefs.current[i];
        const v = videoRefs.current[i] as FullscreenVideo | null;
        if (!frame || !v) return;

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
            return;
        }

        if (frame.requestFullscreen) {
            frame
                .requestFullscreen()
                .then(() => {
                    (screen.orientation as LockableOrientation | undefined)
                        ?.lock?.('landscape')
                        .catch(() => {});
                })
                .catch(() => v.webkitEnterFullscreen?.());
        } else {
            v.webkitEnterFullscreen?.();
        }
    }, []);

    const seek = (i: number, clientX: number, bar: HTMLElement) => {
        const v = videoRefs.current[i];
        if (!v || !v.duration) return;
        const r = bar.getBoundingClientRect();
        const t = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
        v.currentTime = t * v.duration;
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!inViewRef.current || e.metaKey || e.ctrlKey || e.altKey) return;
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

            const i = activeRef.current;

            switch (e.key) {
                case 'ArrowDown':
                case 'PageDown':
                case 'j':
                    e.preventDefault();
                    go(i + 1);
                    break;
                case 'ArrowUp':
                case 'PageUp':
                case 'k':
                    e.preventDefault();
                    go(i - 1);
                    break;
                case ' ':
                    if (t?.tagName === 'BUTTON' || t?.tagName === 'A') return;
                    e.preventDefault();
                    togglePlay(i);
                    break;
                case 'm':
                    toggleMute();
                    break;
                case 'f':
                    if (i < total) toggleFullscreen(i);
                    break;
            }
        };

        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [go, togglePlay, toggleMute, toggleFullscreen, total]);

    const onEnd = active >= total;

    return (
        <div
            ref={wrapRef}
            className="vr-wrap"
            data-lenis-prevent
        >
            <style>{css}</style>
            <div ref={scrollerRef} className="vr-scroller" data-lenis-prevent>
                {videos.map((video, i) => {
                    const isActive = i === active;
                    const near = Math.abs(i - active) <= 1;

                    return (
                        <section
                            key={video.src}
                            ref={(el) => {
                                slideRefs.current[i] = el;
                            }}
                            data-index={i}
                            className={`vr-slide${isActive ? ' is-active' : ''}`}
                            style={{ '--ar': video.aspectRatio ?? 16 / 9 } as CSSProperties}
                            aria-label={`${video.title}, video ${i + 1} of ${total}`}
                        >
                            <div className="vr-stage media-reveal">
                            <p className="vr-count load-reveal" aria-hidden="true">
                                {pad2(i + 1)} / {pad2(total)}
                            </p>
                            <div className="vr-ambient" aria-hidden="true">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={video.poster}
                                    alt=""
                                    loading={near ? 'eager' : 'lazy'}
                                    onLoad={(e) => e.currentTarget.classList.add('is-loaded')}
                                />
                                <canvas
                                    ref={(el) => {
                                        glowRefs.current[i] = el;
                                    }}
                                    width={64}
                                    height={36}
                                />
                            </div>
                            <div
                                ref={(el) => {
                                    frameRefs.current[i] = el;
                                }}
                                className="vr-frame"
                                onClick={() => togglePlay(i)}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    className="vr-poster"
                                    src={video.poster}
                                    alt=""
                                    loading={near ? 'eager' : 'lazy'}
                                    onLoad={(e) => e.currentTarget.classList.add('is-loaded')}
                                />
                                <video
                                    ref={(el) => {
                                        videoRefs.current[i] = el;
                                    }}
                                    className="vr-video"
                                    src={video.src}
                                    muted
                                    playsInline
                                    preload={i === 0 ? 'auto' : 'none'}
                                    aria-label={video.title}
                                />
                                {isActive && buffering && (
                                    <span className="vr-center vr-spinner" aria-hidden="true">
                                        <Loader2 />
                                    </span>
                                )}

                                {isActive && !playing && !buffering && (
                                    <span className="vr-center vr-play" aria-hidden="true">
                                        <Play />
                                    </span>
                                )}

                                <div
                                    className="vr-bar"
                                    onClick={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        e.currentTarget.setPointerCapture(e.pointerId);
                                        seek(i, e.clientX, e.currentTarget);
                                    }}
                                    onPointerMove={(e) => {
                                        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                                            seek(i, e.clientX, e.currentTarget);
                                        }
                                    }}
                                >
                                    <span
                                        ref={(el) => {
                                            fillRefs.current[i] = el;
                                        }}
                                        className="vr-fill"
                                    />
                                </div>
                            </div>
                            </div>
                            <div className="vr-info">
                                <div className="vr-text load-reveal" style={{ animationDelay: '0.1s' }}>
                                    <p className="vr-meta">
                                        {video.tag} · {video.year}
                                    </p>
                                    <h2 className="vr-title">{video.title}</h2>
                                    <p className="vr-desc">{video.desc}</p>
                                </div>
                                <div className="vr-controls load-reveal" style={{ animationDelay: '0.2s' }}>
                                    <button
                                        type="button"
                                        className="vr-btn vr-btn--label"
                                        onClick={toggleMute}
                                        aria-pressed={!muted}
                                    >
                                        {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
                                        <span>{muted ? 'sound off' : 'sound on'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="vr-btn"
                                        onClick={() => toggleFullscreen(i)}
                                        aria-label="fullscreen"
                                    >
                                        <Maximize aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        </section>
                    );
                })}

                <section
                    ref={(el) => {
                        slideRefs.current[total] = el;
                    }}
                    data-index={total}
                    className="vr-slide vr-end"
                >
                    <p className="vr-end-title">that&apos;s all for now.</p>
                    <a
                        href={INSTAGRAM}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="vr-btn vr-btn--label vr-btn--big"
                    >
                        more on instagram @jkzhouu
                        <ArrowUpRight aria-hidden="true" />
                    </a>
                    <button type="button" className="vr-again" onClick={() => go(0)}>
                        back to the first video
                    </button>
                </section>
            </div>
            <nav className="vr-index" aria-label="videos">
                {videos.map((video, i) => (
                    <button
                        key={video.src}
                        type="button"
                        className={`load-reveal${i === active ? ' is-active' : ''}`}
                        style={{ animationDelay: `${0.15 + i * 0.05}s` }}
                        aria-current={i === active ? 'true' : undefined}
                        onClick={() => go(i)}
                    >
                        {video.title}
                    </button>
                ))}
            </nav>
            <div className="vr-arrows load-reveal" style={{ animationDelay: '0.3s' }}>
                <button
                    type="button"
                    className={`vr-arrow${active === 0 ? ' is-disabled' : ''}`}
                    onClick={() => active > 0 && go(active - 1)}
                    aria-disabled={active === 0}
                    aria-label="previous video"
                >
                    <ChevronUp aria-hidden="true" />
                </button>
                <button
                    type="button"
                    className={`vr-arrow${onEnd ? ' is-disabled' : ''}`}
                    onClick={() => !onEnd && go(active + 1)}
                    aria-disabled={onEnd}
                    aria-label="next video"
                >
                    <ChevronDown aria-hidden="true" />
                </button>
            </div>
            {active === 0 && !scrolled && (
                <p className="vr-hint" aria-hidden="true">
                    scroll <ChevronDown />
                </p>
            )}
        </div>
    );
}

const css = `
  .vr-wrap {
    --nav: 52px;
    --side: 0px;
    --edge: clamp(16px, 2.4vw, 40px);
    position: relative;
    height: 100svh;
    overflow: hidden;
    background: var(--background, #fff);
    color: #0f0f15;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  }

  @media (min-width: 1000px) {
    .vr-wrap {
      --side: clamp(200px, 17vw, 300px);
    }
  }

  .vr-scroller {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    scroll-snap-type: y mandatory;
    scrollbar-width: none;
  }

  .vr-scroller::-webkit-scrollbar {
    display: none;
  }

  .vr-slide {
    --w: min(
      calc(100vw - 2 * var(--side) - 2 * var(--edge)),
      calc((100svh - 240px) * var(--ar))
    );
    position: relative;
    height: 100svh;
    box-sizing: border-box;
    padding: var(--nav) 0 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    scroll-snap-align: start;
    scroll-snap-stop: always;
  }

  .vr-stage {
    position: relative;
    z-index: 1;
    width: var(--w);
  }

  .vr-ambient {
    position: absolute;
    inset: -4% -3%;
    z-index: -1;
    opacity: 0.34;
    filter: blur(44px) saturate(1.15);
    pointer-events: none;
    transform: translateZ(0);
  }

  /* posters fade in once loaded instead of popping in */
  .vr-ambient img,
  .vr-poster {
    opacity: 0;
    transition: opacity 0.8s ease;
  }

  .vr-ambient img.is-loaded,
  .vr-poster.is-loaded {
    opacity: 1;
  }

  .vr-ambient img,
  .vr-ambient canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .vr-ambient canvas {
    opacity: 0;
    transition: opacity 1.2s ease;
  }

  .vr-ambient canvas.is-on {
    opacity: 1;
  }

  .vr-frame {
    position: relative;
    width: 100%;
    aspect-ratio: var(--ar);
    overflow: hidden;
    /* soft placeholder until the poster arrives */
    background: color-mix(in srgb, currentColor 6%, transparent);
    cursor: pointer;
  }

  .vr-poster,
  .vr-video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .vr-video {
    opacity: 0;
    transition: opacity 0.6s ease;
  }

  .vr-video.is-started {
    opacity: 1;
  }

  .vr-frame:fullscreen {
    width: 100%;
    height: 100%;
    aspect-ratio: auto;
    background: #000;
    box-shadow: none;
  }

  .vr-frame:fullscreen .vr-poster,
  .vr-frame:fullscreen .vr-video {
    object-fit: contain;
  }

  .vr-center {
    position: absolute;
    top: 50%;
    left: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    margin: -32px 0 0 -32px;
    color: #fff;
    filter: drop-shadow(0 1px 8px rgba(0, 0, 0, 0.45));
    pointer-events: none;
    animation: vr-fade 0.4s ease both;
  }

  .vr-center svg {
    width: 38px;
    height: 38px;
  }

  .vr-play svg {
    margin-left: 3px;
    fill: currentColor;
  }

  .vr-spinner svg {
    animation: vr-spin 1s linear infinite;
  }

  @keyframes vr-spin {
    to { transform: rotate(360deg); }
  }

  @keyframes vr-fade {
    from { opacity: 0; }
  }

  .vr-bar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
    height: 18px;
    cursor: pointer;
    touch-action: none;
  }

  .vr-bar::before,
  .vr-fill {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    transition: height 0.2s ease;
  }

  .vr-bar::before {
    background: rgba(255, 255, 255, 0.22);
  }

  .vr-fill {
    background: #fff;
    transform: scaleX(0);
    transform-origin: left;
  }

  .vr-bar:hover::before,
  .vr-bar:hover .vr-fill {
    height: 4px;
  }

  .vr-info {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    width: var(--w);
    margin-top: 18px;
  }

  .vr-text {
    min-width: 0;
  }

  .vr-meta,
  .vr-btn,
  .vr-count,
  .vr-hint,
  .vr-again {
    font-size: 10px;
    font-weight: 600;
    line-height: 1.6;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .vr-meta {
    margin: 0;
    opacity: 0.6;
  }

  .vr-title {
    margin: 4px 0 0;
    font-size: clamp(22px, 2.4vw, 38px);
    font-weight: 600;
    line-height: 1.05;
    letter-spacing: -0.02em;
  }

  .vr-desc {
    margin: 8px 0 0;
    max-width: 36em;
    font-size: 15px;
    line-height: 1.4;
    opacity: 0.6;
  }

  .vr-controls {
    display: flex;
    flex-shrink: 0;
    gap: 8px;
  }

  .vr-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 40px;
    height: 40px;
    padding: 0;
    border: 1px solid rgba(15, 15, 21, 0.16);
    border-radius: 999px;
    background: transparent;
    color: inherit;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.3s ease, border-color 0.3s ease, opacity 0.3s ease;
  }

  .vr-btn--label {
    padding: 0 14px 0 12px;
  }

  .vr-btn svg {
    width: 16px;
    height: 16px;
  }

  .vr-btn:hover:not(:disabled) {
    background: rgba(15, 15, 21, 0.05);
    border-color: rgba(15, 15, 21, 0.3);
  }

  .vr-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .vr-btn:focus-visible,
  .vr-arrow:focus-visible,
  .vr-index button:focus-visible,
  .vr-again:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 3px;
  }

  .vr-end {
    gap: 22px;
    text-align: center;
  }

  .vr-end-title {
    position: relative;
    z-index: 1;
    margin: 0;
    font-size: clamp(40px, 6vw, 96px);
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.03em;
  }

  .vr-btn--big {
    position: relative;
    z-index: 1;
    height: 48px;
    padding: 0 18px 0 22px;
  }

  .vr-again {
    position: relative;
    z-index: 1;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 4px;
    cursor: pointer;
    opacity: 0.6;
  }

  .vr-again:hover {
    opacity: 1;
  }

  .vr-index {
    position: absolute;
    top: 50%;
    left: var(--edge);
    z-index: 3;
    display: none;
    flex-direction: column;
    width: calc(var(--side) - var(--edge) - 24px);
    margin: 0;
    padding: 0;
    list-style: none;
    transform: translateY(-50%);
  }

  .vr-index button {
    display: block;
    width: 100%;
    padding: 7px 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    font-size: 15px;
    font-weight: 500;
    line-height: 1.25;
    letter-spacing: -0.01em;
    text-align: left;
    cursor: pointer;
    opacity: 0.38;
    transition: opacity 0.3s ease;
  }

  .vr-index button:hover {
    opacity: 0.75;
  }

  .vr-index button.is-active {
    font-weight: 600;
    opacity: 1;
  }

  .vr-count {
    position: absolute;
    right: 0;
    bottom: calc(100% + 10px);
    z-index: 1;
    margin: 0;
    font-variant-numeric: tabular-nums;
    opacity: 0.7;
  }

  .vr-arrows {
    position: absolute;
    top: 50%;
    right: var(--edge);
    z-index: 3;
    display: none;
    flex-direction: column;
    gap: 8px;
    transform: translateY(-50%);
  }

  .vr-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    cursor: pointer;
    opacity: 0.55;
    transition: opacity 0.3s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .vr-arrow svg {
    width: 24px;
    height: 24px;
    stroke-width: 1.5;
  }

  .vr-arrow:hover:not(.is-disabled) {
    opacity: 1;
  }

  .vr-arrow:first-child:hover:not(.is-disabled) {
    transform: translateY(-2px);
  }

  .vr-arrow:last-child:hover:not(.is-disabled) {
    transform: translateY(2px);
  }

  .vr-arrow.is-disabled {
    opacity: 0.18;
    cursor: default;
  }

  .vr-hint {
    position: absolute;
    bottom: 18px;
    left: 50%;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    margin: 0;
    transform: translateX(-50%);
    opacity: 0.7;
    pointer-events: none;
    /* load-reveal: the shared text reveal on load (globals.css) */
    animation:
      vr-bob 1.8s ease-in-out infinite,
      load-reveal 1.2s ease 0.3s backwards;
  }

  .vr-hint svg {
    width: 14px;
    height: 14px;
  }

  @keyframes vr-bob {
    0%, 100% { transform: translate(-50%, 0); }
    50% { transform: translate(-50%, 4px); }
  }

  @media (min-width: 1000px) {
    .vr-index,
    .vr-arrows {
      display: flex;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .vr-hint,
    .vr-center,
    .vr-spinner svg {
      animation: none;
    }
  }
`;
