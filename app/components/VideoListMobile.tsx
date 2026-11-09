'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Maximize, Play, Volume2, VolumeX } from 'lucide-react';
import type { ReelVideo } from './VideoReel';

type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

export default function VideoListMobile({ videos }: { videos: ReelVideo[] }) {
    const total = videos.length;

    const rootRef = useRef<HTMLElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const fillRef = useRef<HTMLSpanElement>(null);
    const rowRefs = useRef<(HTMLLIElement | null)[]>([]);

    const [active, setActive] = useState(0);
    const [muted, setMuted] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [buffering, setBuffering] = useState(false);
    const [started, setStarted] = useState(false);

    const activeRef = useRef(0);
    const mutedRef = useRef(true);
    const userPausedRef = useRef(false);

    const current = videos[active];

    useEffect(() => {
        const nav = document.querySelector<HTMLElement>('[data-site-nav]');
        rootRef.current?.style.setProperty('--nav-h', `${nav?.offsetHeight ?? 52}px`);

        const v = videoRef.current;
        if (v) {
            v.defaultMuted = true;
            v.setAttribute('muted', '');
        }
    }, []);

    useEffect(() => {
        const root = rootRef.current;
        const stage = stageRef.current;
        if (!root || !stage) return;

        const measure = () => root.style.setProperty('--stage-h', `${stage.offsetHeight}px`);
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(stage);

        document.documentElement.classList.add('vm-snap');
        return () => {
            ro.disconnect();
            document.documentElement.classList.remove('vm-snap');
        };
    }, []);

    useEffect(() => {
        mutedRef.current = muted;
        if (videoRef.current) videoRef.current.muted = muted;
    }, [muted]);

    const readingLine = useCallback(() => {
        const stage = stageRef.current;
        if (!stage) return 0;
        const bottom = stage.getBoundingClientRect().bottom;
        return bottom + Math.min(56, (window.innerHeight - bottom) * 0.3);
    }, []);

    const scrollToRow = useCallback(
        (i: number) => {
            const row = rowRefs.current[Math.max(0, Math.min(total - 1, i))];
            const stage = stageRef.current;
            if (!row || !stage) return;
            const top =
                window.scrollY + row.getBoundingClientRect().top - stage.getBoundingClientRect().bottom - 8;
            window.scrollTo({ top, behavior: 'instant' });
        },
        [total]
    );

    useEffect(() => {
        let raf = 0;

        const pick = () => {
            raf = 0;
            const line = readingLine();
            let next = 0;
            rowRefs.current.forEach((row, i) => {
                if (row && row.getBoundingClientRect().top <= line) next = i;
            });
            if (next === activeRef.current) return;
            activeRef.current = next;
            setActive(next);
            setPlaying(false);
            setBuffering(false);
            setStarted(false);
        };

        const onScroll = () => {
            if (!raf) raf = requestAnimationFrame(pick);
        };

        raf = requestAnimationFrame(pick);
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, [readingLine]);

    useEffect(() => {
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (!e.isIntersecting) continue;
                    (e.target as HTMLElement).dataset.in = '';
                    io.unobserve(e.target);
                }
            },
            { rootMargin: '0px 0px -8% 0px' }
        );
        rowRefs.current.forEach((r) => r && io.observe(r));
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;

        const onPlay = () => setPlaying(true);
        const onPause = () => {
            setPlaying(false);
            setBuffering(false);
        };
        const onWaiting = () => setBuffering(true);
        const onPlaying = () => {
            setBuffering(false);
            setStarted(true);
        };
        const onReady = () => {
            if (v.paused && !userPausedRef.current) {
                v.muted = mutedRef.current;
                v.play().catch(() => {
                    v.muted = true;
                    v.play().catch(() => {});
                });
            }
        };
        const onEnded = () => scrollToRow(activeRef.current + 1);

        v.addEventListener('play', onPlay);
        v.addEventListener('pause', onPause);
        v.addEventListener('waiting', onWaiting);
        v.addEventListener('playing', onPlaying);
        v.addEventListener('canplay', onPlaying);
        v.addEventListener('loadeddata', onReady);
        v.addEventListener('canplay', onReady);
        v.addEventListener('ended', onEnded);

        return () => {
            v.removeEventListener('play', onPlay);
            v.removeEventListener('pause', onPause);
            v.removeEventListener('waiting', onWaiting);
            v.removeEventListener('playing', onPlaying);
            v.removeEventListener('canplay', onPlaying);
            v.removeEventListener('loadeddata', onReady);
            v.removeEventListener('canplay', onReady);
            v.removeEventListener('ended', onEnded);
        };
    }, [scrollToRow]);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        userPausedRef.current = false;
        v.muted = mutedRef.current;
        v.play().catch(() => {
            if (!v.muted) {
                v.muted = true;
                setMuted(true);
                v.play().catch(() => {});
            }
        });
    }, [active]);

    useEffect(() => {
        let raf = 0;
        const loop = () => {
            const v = videoRef.current;
            const fill = fillRef.current;
            if (v && fill) fill.style.transform = `scaleX(${v.duration ? v.currentTime / v.duration : 0})`;
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    const togglePlay = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) {
            userPausedRef.current = false;
            v.play().catch(() => {});
        } else {
            userPausedRef.current = true;
            v.pause();
        }
    };

    const toggleMute = () => {
        const next = !muted;
        setMuted(next);
        const v = videoRef.current;
        if (v) {
            v.muted = next;
            if (!next && v.paused) v.play().catch(() => {});
        }
    };

    const toggleFullscreen = () => {
        const panel = panelRef.current;
        const v = videoRef.current as FullscreenVideo | null;
        if (!panel || !v) return;
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        } else if (panel.requestFullscreen) {
            panel.requestFullscreen().catch(() => v.webkitEnterFullscreen?.());
        } else {
            v.webkitEnterFullscreen?.();
        }
    };

    const seek = (clientX: number, bar: HTMLElement) => {
        const v = videoRef.current;
        if (!v || !v.duration) return;
        const r = bar.getBoundingClientRect();
        v.currentTime = Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * v.duration;
    };

    return (
        <section ref={rootRef} className="vm-root" data-lenis-prevent>
            <style>{css}</style>
            <div ref={stageRef} className="vm-stage">
                <div ref={panelRef} className="vm-panel media-reveal" onClick={togglePlay}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        key={current.poster}
                        className="vm-poster"
                        src={current.poster}
                        alt=""
                        onLoad={(e) => e.currentTarget.classList.add('is-loaded')}
                    />
                    <video
                        ref={videoRef}
                        className={`vm-video${started ? ' is-started' : ''}`}
                        src={current.src}
                        muted
                        autoPlay
                        playsInline
                        preload="auto"
                        aria-label={current.title}
                    />
                    {buffering && (
                        <span className="vm-center vm-spin" aria-hidden="true">
                            <Loader2 />
                        </span>
                    )}
                    {!playing && !buffering && (
                        <span className="vm-center vm-play" aria-hidden="true">
                            <Play />
                        </span>
                    )}

                    <div
                        className="vm-bar"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            e.currentTarget.setPointerCapture(e.pointerId);
                            seek(e.clientX, e.currentTarget);
                        }}
                        onPointerMove={(e) => {
                            if (e.currentTarget.hasPointerCapture(e.pointerId)) seek(e.clientX, e.currentTarget);
                        }}
                    >
                        <span ref={fillRef} className="vm-fill" />
                    </div>
                </div>
                <div className="vm-controls load-reveal" style={{ animationDelay: '0.15s' }}>
                    <span className="vm-now">{current.title}</span>
                    <div className="vm-buttons">
                        <button type="button" className="vm-btn" onClick={toggleMute} aria-pressed={!muted}>
                            {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
                            <span>{muted ? 'sound off' : 'sound on'}</span>
                        </button>
                        <button
                            type="button"
                            className="vm-btn vm-btn--icon"
                            onClick={toggleFullscreen}
                            aria-label="fullscreen"
                        >
                            <Maximize aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
            <ol className="vm-list">
                {videos.map((video, i) => (
                    <li
                        key={video.src}
                        ref={(el) => {
                            rowRefs.current[i] = el;
                        }}
                        className={`vm-row${i === active ? ' is-active' : ''}`}
                    >
                        <button
                            type="button"
                            className="vm-link"
                            onClick={() => (i === active ? togglePlay() : scrollToRow(i))}
                            aria-current={i === active ? 'true' : undefined}
                        >
                            <span className="vm-title load-reveal">{video.title}</span>
                            <span className="vm-meta load-reveal" style={{ animationDelay: '0.08s' }}>
                                {video.tag} · {video.year}
                            </span>
                            <span className="vm-desc load-reveal" style={{ animationDelay: '0.16s' }}>
                                {video.desc}
                            </span>
                        </button>
                    </li>
                ))}
            </ol>
        </section>
    );
}

const css = `
  .vm-root {
    --pad: clamp(16px, 4vw, 64px);
    --line: color-mix(in srgb, currentColor 14%, transparent);
    position: relative;
    padding: 0 var(--pad) 42vh;
    font-family: "Neue Montreal", "Helvetica Neue", Helvetica, Arial, sans-serif;
  }

  .vm-stage {
    position: sticky;
    top: 0;
    z-index: 2;
    margin: 0 calc(-1 * var(--pad)) 8px;
    padding: calc(var(--nav-h, 52px) + 8px) var(--pad) 12px;
    background: var(--background, #fff);
  }

  .vm-stage::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    height: 32px;
    background: linear-gradient(var(--background, #fff), transparent);
    pointer-events: none;
  }

  .vm-meta,
  .vm-now,
  .vm-btn {
    font-size: 10px;
    font-weight: 600;
    line-height: 1.6;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .vm-panel {
    position: relative;
    aspect-ratio: 3 / 2;
    overflow: hidden;
    background: color-mix(in srgb, currentColor 6%, transparent);
    cursor: pointer;
  }

  .vm-poster,
  .vm-video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* fades in once loaded (and again for each video's poster) instead of popping in */
  .vm-poster {
    opacity: 0;
    transition: opacity 0.5s ease;
  }

  .vm-poster.is-loaded {
    opacity: 1;
  }

  .vm-video {
    opacity: 0;
    transition: opacity 0.5s ease;
  }

  .vm-video.is-started {
    opacity: 1;
  }

  .vm-panel:fullscreen {
    aspect-ratio: auto;
    width: 100%;
    height: 100%;
    background: #000;
  }

  .vm-panel:fullscreen .vm-poster,
  .vm-panel:fullscreen .vm-video {
    object-fit: contain;
  }

  .vm-center {
    position: absolute;
    top: 50%;
    left: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    margin: -26px 0 0 -26px;
    color: #fff;
    filter: drop-shadow(0 1px 8px rgba(0, 0, 0, 0.45));
    pointer-events: none;
    animation: vm-fade 0.3s ease both;
  }

  .vm-center svg {
    width: 34px;
    height: 34px;
  }

  .vm-play svg {
    margin-left: 2px;
    fill: currentColor;
  }

  .vm-spin svg {
    animation: vm-rot 1s linear infinite;
  }

  .vm-bar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 18px;
    touch-action: none;
  }

  .vm-bar::before,
  .vm-fill {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
  }

  .vm-bar::before {
    background: rgba(255, 255, 255, 0.3);
  }

  .vm-fill {
    background: #fff;
    transform: scaleX(0);
    transform-origin: left;
  }

  .vm-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 10px;
  }

  .vm-now {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.55;
  }

  .vm-buttons {
    display: flex;
    flex-shrink: 0;
    gap: 6px;
  }

  .vm-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px 0 10px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: none;
    color: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .vm-btn--icon {
    width: 32px;
    padding: 0;
  }

  .vm-btn svg {
    width: 14px;
    height: 14px;
  }

  .vm-btn:active {
    background: color-mix(in srgb, currentColor 6%, transparent);
  }

  .vm-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  html.vm-snap {
    scroll-snap-type: y mandatory;
  }

  html.vm-snap footer {
    scroll-snap-align: end;
  }

  .vm-row {
    border-top: 1px solid var(--line);
    transition: opacity 0.4s ease;
    scroll-snap-align: start;
    scroll-snap-stop: always;
    scroll-margin-top: calc(var(--stage-h, 400px) + 8px);
  }

  .vm-row:last-child {
    border-bottom: 1px solid var(--line);
  }

  .vm-row:not(.is-active) {
    opacity: 0.45;
  }

  .vm-link {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    row-gap: 4px;
    width: 100%;
    padding: 30px 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    opacity: 0;
    transition: opacity 1.2s ease;
  }

  .vm-row[data-in] .vm-link {
    opacity: 1;
  }

  .vm-title {
    grid-column: 1;
    font-size: clamp(28px, 8.5vw, 44px);
    font-weight: 600;
    line-height: 1.02;
    letter-spacing: -0.02em;
  }

  .vm-meta {
    grid-column: 1;
    margin-top: 4px;
    opacity: 0.6;
  }

  .vm-desc {
    grid-column: 1;
    font-size: 14px;
    line-height: 1.4;
    opacity: 0.6;
  }

  @keyframes vm-fade {
    from { opacity: 0; }
  }

  @keyframes vm-rot {
    to { transform: rotate(360deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .vm-center,
    .vm-spin svg {
      animation: none;
    }

    .vm-link {
      opacity: 1;
      transition: none;
    }
  }
`;
