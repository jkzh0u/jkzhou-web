"use client";

import Image from "next/image";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

// width and height are the photo's real size (read on the server), so each thumbnail holds
// exactly its own space while it loads
export type AlbumPhoto = { src: string; width: number; height: number };

type Album = {
  slug: string;
  title: string;
  photos: readonly AlbumPhoto[];
};

// Matches the sm breakpoint (640px): 2 columns below, 3 above
function subscribe(callback: () => void) {
  const mq = window.matchMedia("(min-width: 640px)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

const getColumnCount = () =>
  window.matchMedia("(min-width: 640px)").matches ? 3 : 2;

const getServerColumnCount = () => 3;

const THUMB_SIZES = "(max-width: 640px) 50vw, 33vw";

// The first row is what people see first, so only it gets priority
const PRIORITY_COUNT = 3;

// Same order as Finder's "sort by name": numbers compare by value
// (2 before 10) and case is ignored.
const finderCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

const Thumb = memo(function Thumb({
  src,
  width,
  height,
  alt,
  priority,
  onSelect,
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
  priority: boolean;
  onSelect: (src: string) => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect(src)}
      aria-label={`Open ${alt}`}
      className={`ag-thumb group block w-full overflow-hidden text-left${loaded ? " is-loaded" : ""}`}
    >
      <Image
        src={src}
        alt={alt}
        // the real size, so the box has the photo's shape before it loads
        width={width}
        height={height}
        sizes={THUMB_SIZES}
        priority={priority}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className="
          ag-img h-auto w-full
          transition-[transform,filter,opacity] duration-500 ease-out
          group-hover:scale-[1.015] group-hover:brightness-105
          motion-reduce:transition-none
        "
      />
    </button>
  );
});

export default function AlbumGallery({
  album,
}: {
  album: Album;
}) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  // which enlarged photo has finished loading, so stepping to a new one hides it until it's ready
  const [loadedPhoto, setLoadedPhoto] = useState<string | null>(null);
  const bigLoaded = selectedPhoto !== null && loadedPhoto === selectedPhoto;
  // Stepping lays the next photo over the current one like a sheet of paper: `under` is the photo
  // being covered (kept until the new one has landed) and `dir` the side the new one comes from.
  const [under, setUnder] = useState<string | null>(null);
  const [dir, setDir] = useState<0 | 1 | -1>(0);
  // latest open and loaded photo, for the step handler
  const selectedRef = useRef<string | null>(null);
  const loadedRef = useRef<string | null>(null);
  const closeTimer = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // the thumbnail that opened the viewer, so focus can go back to it on close
  const openerRef = useRef<HTMLElement | null>(null);
  // where a touch started, and whether it turned into a swipe (so its click doesn't close)
  const swipeStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);

  const columnCount = useSyncExternalStore(
    subscribe,
    getColumnCount,
    getServerColumnCount
  );

  const sorted = useMemo(
    () => [...album.photos].sort((a, b) => finderCollator.compare(a.src, b.src)),
    [album.photos]
  );
  const srcs = useMemo(() => sorted.map((p) => p.src), [sorted]);
  const sizeOf = useMemo(() => new Map(sorted.map((p) => [p.src, p])), [sorted]);

  // Masonry with left-to-right order: 1 2 3 across the top, then 4 5 6.
  // Heights stay mismatched.
  const columns = useMemo(() => {
    const cols: { photo: AlbumPhoto; index: number }[][] = Array.from(
      { length: columnCount },
      () => []
    );

    sorted.forEach((photo, index) => {
      cols[index % columnCount].push({ photo, index });
    });

    return cols;
  }, [sorted, columnCount]);

  // Position of the open photo, and its neighbours (wrapping at the ends)
  const selectedIndex = selectedPhoto ? srcs.indexOf(selectedPhoto) : -1;
  const neighbours =
    selectedIndex >= 0 && srcs.length > 1
      ? [
          srcs[(selectedIndex - 1 + srcs.length) % srcs.length],
          srcs[(selectedIndex + 1) % srcs.length],
        ]
      : [];

  const open = useCallback((src: string) => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }

    if (document.activeElement instanceof HTMLElement) {
      openerRef.current = document.activeElement;
    }
    setVisible(false);
    setUnder(null);
    setDir(0);
    selectedRef.current = src;
    setSelectedPhoto(src);
  }, []);

  const close = useCallback(() => {
    setVisible(false);

    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
    }

    closeTimer.current = window.setTimeout(() => {
      selectedRef.current = null;
      setUnder(null);
      setSelectedPhoto(null);
      closeTimer.current = null;
      openerRef.current?.focus({ preventScroll: true });
      openerRef.current = null;
    }, 300);
  }, []);

  // Step to the previous (-1) or next (+1) photo, wrapping at the ends
  const step = useCallback(
    (to: 1 | -1) => {
      const current = selectedRef.current;
      if (!current || srcs.length < 2) return;
      const next = srcs[(srcs.indexOf(current) + to + srcs.length) % srcs.length];
      // the photo on screen goes underneath; if it never loaded, whatever was under stays
      if (loadedRef.current === current) setUnder(current);
      setDir(to);
      selectedRef.current = next;
      setSelectedPhoto(next);
    },
    [srcs]
  );

  const onNavClick = (to: 1 | -1) => (e: React.MouseEvent) => {
    e.stopPropagation(); // don't close the viewer
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    step(to);
  };

  // Phones: swipe left/right to step, swipe down to close. Taps still close as before.
  const SWIPE_MIN = 50;
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch" || !e.isPrimary) return;
    swipeStart.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    swiped.current = false;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) {
      swiped.current = true;
      step(dx < 0 ? 1 : -1);
    } else if (dy >= SWIPE_MIN * 1.6 && dy > Math.abs(dx)) {
      swiped.current = true;
      close();
    }
  };
  const onOverlayClick = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    close();
  };

  const isOpen = selectedPhoto !== null;

  // Fade in after opening; Escape closes, left/right arrows step through the album
  useEffect(() => {
    if (!isOpen) return;

    let raf2 = 0;

    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setVisible(true));
    });

    // move focus into the viewer so screen readers announce it and Tab stays inside
    dialogRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        // nothing to tab to inside the viewer, so keep focus on it
        e.preventDefault();
      } else if (e.key === "Escape") {
        close();
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        step(e.key === "ArrowRight" ? 1 : -1);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close, step]);

  // Clear any pending close timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
      }
    };
  }, []);

  return (
    <>
      <style>{css}</style>
      <div className="flex items-start gap-5">
        {columns.map((col, c) => (
          <div key={c} className="flex min-w-0 flex-1 flex-col gap-5">
            {col.map(({ photo, index }) => (
              <Thumb
                key={photo.src}
                // R2 URLs are passed directly from AlbumPage.
                src={photo.src}
                width={photo.width}
                height={photo.height}
                alt={`${album.title} photo ${index + 1}`}
                priority={index < PRIORITY_COUNT}
                onSelect={open}
              />
            ))}
          </div>
        ))}
      </div>

      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${album.title} photo`}
          ref={dialogRef}
          tabIndex={-1}
          data-lenis-prevent
          onClick={onOverlayClick}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipeStart.current = null)}
          style={{ "--dir": dir || 1 } as React.CSSProperties}
          className={`
            ag-viewer fixed inset-0 z-50 flex items-center justify-center
            bg-black/40 p-4 outline-none
            transition-[opacity,backdrop-filter] duration-300 ease-out
            motion-reduce:transition-none
            ${
              visible
                ? "opacity-100 backdrop-blur-xl"
                : "opacity-0 backdrop-blur-none"
            }
          `}
        >
          {!bigLoaded && (
            <span className="ag-spin" aria-hidden="true" />
          )}
          {/* Keyed by photo, so the one on screen keeps its element when it becomes the sheet
              underneath, and only the new photo mounts (and fades in once loaded). */}
          {(under && under !== selectedPhoto ? [under, selectedPhoto] : [selectedPhoto]).map(
            (src) => {
              const top = src === selectedPhoto;
              const size = sizeOf.get(src);
              const landed = visible && bigLoaded;
              return (
                <Image
                  key={src}
                  src={src}
                  alt={top ? `${album.title} enlarged photo` : ""}
                  aria-hidden={top ? undefined : true}
                  width={size?.width ?? 2400}
                  height={size?.height ?? 1600}
                  sizes="82vw"
                  onLoad={
                    top
                      ? () => {
                          loadedRef.current = src;
                          setLoadedPhoto(src);
                        }
                      : undefined
                  }
                  onError={top ? () => setLoadedPhoto(src) : undefined}
                  onAnimationEnd={
                    top
                      ? (e) => {
                          if (e.animationName === "ag-paper-in") setUnder(null);
                        }
                      : undefined
                  }
                  className={`
                    h-auto max-h-[88vh] w-auto max-w-[82vw] object-contain shadow-2xl
                    transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                    motion-reduce:transition-none
                    ${
                      !top
                        ? `ag-under${bigLoaded ? " is-covered" : ""}`
                        : landed
                          ? `relative scale-100 opacity-100 ${dir ? "ag-paper-in" : "ag-big-in"}`
                          : under
                            ? "relative opacity-0"
                            : "relative scale-95 opacity-0"
                    }
                  `}
                />
              );
            }
          )}

          {srcs.length > 1 &&
            ([-1, 1] as const).map((to) => (
              <button
                key={to}
                type="button"
                tabIndex={-1}
                aria-label={to < 0 ? "previous photo" : "next photo"}
                onClick={onNavClick(to)}
                className={`ag-nav ${to < 0 ? "ag-nav-prev" : "ag-nav-next"}`}
              >
                <span className="ag-nav-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={to < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
                  </svg>
                </span>
              </button>
            ))}
          {/* load the previous and next photos in the background so arrowing is instant */}
          {neighbours.map((src) => (
            <Image
              key={`pre-${src}`}
              src={src}
              alt=""
              aria-hidden="true"
              width={sizeOf.get(src)?.width ?? 2400}
              height={sizeOf.get(src)?.height ?? 1600}
              sizes="82vw"
              loading="eager"
              className="pointer-events-none absolute h-px w-px opacity-0"
            />
          ))}
        </div>
      )}
    </>
  );
}

const css = `
  /* the browser hands horizontal and vertical drags to the swipe handler; pinch-zoom still works */
  .ag-viewer {
    touch-action: pinch-zoom;
  }

  .ag-viewer img {
    -webkit-user-drag: none;
    user-select: none;
  }

  .ag-thumb {
    position: relative;
    background: color-mix(in srgb, currentColor 6%, transparent);
  }

  .ag-thumb::after {
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
    animation: ag-shimmer 1.4s linear infinite;
    transition: opacity 0.5s ease;
    pointer-events: none;
  }

  .ag-thumb.is-loaded {
    background: none;
  }

  .ag-thumb.is-loaded::after {
    opacity: 0;
    animation: none;
  }

  .ag-img {
    opacity: 0;
  }

  .ag-thumb.is-loaded .ag-img {
    opacity: 1;
  }

  .ag-spin {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 28px;
    height: 28px;
    margin: -14px 0 0 -14px;
    border: 2px solid rgba(255, 255, 255, 0.35);
    border-top-color: #fff;
    border-radius: 999px;
    animation: ag-rot 0.9s linear infinite;
  }

  /* Each enlarged photo animates in once loaded. An animation rather than a transition, because
     a preloaded photo loads before it is ever painted hidden, so a transition would have nothing
     to start from. Same blur as the site-wide load-reveal (globals.css). Fill mode backwards, so
     the closing fade (a transition) still works afterwards. */
  .ag-big-in {
    animation: ag-big-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  }

  @keyframes ag-big-in {
    from {
      opacity: 0;
      transform: scale(0.97);
      filter: blur(8px);
    }
  }

  /* stepping: the next photo is laid on top like a sheet of paper, sliding in from the side it
     came from with a slight turn, while the one underneath sinks back and fades out */
  .ag-paper-in {
    animation: ag-paper-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  }

  @keyframes ag-paper-in {
    from {
      opacity: 0;
      transform: translateX(calc(var(--dir) * 34vw)) rotate(calc(var(--dir) * 6deg)) scale(1.03);
      box-shadow: 0 40px 80px rgba(0, 0, 0, 0.45);
    }
    35% {
      opacity: 1;
    }
  }

  .ag-under {
    position: absolute;
    inset: 0;
    margin: auto;
  }

  .ag-under.is-covered {
    animation: ag-under-out 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  @keyframes ag-under-out {
    70% {
      opacity: 1;
    }
    to {
      opacity: 0;
      transform: translateX(calc(var(--dir) * -4vw)) rotate(calc(var(--dir) * -1.5deg)) scale(0.93);
      filter: brightness(0.6);
    }
  }

  /* big click areas down each side, with an arrow that shows on hover */
  .ag-nav {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    width: clamp(64px, 16vw, 260px);
    padding: 0 clamp(12px, 2.5vw, 36px);
    border: 0;
    background: none;
    color: #fff;
    cursor: pointer;
  }

  .ag-nav-prev {
    left: 0;
    justify-content: flex-start;
    --side: -1;
  }

  .ag-nav-next {
    right: 0;
    justify-content: flex-end;
    --side: 1;
  }

  .ag-nav-icon {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.32);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    opacity: 0;
    transform: translateX(calc(var(--side) * -8px));
    transition: opacity 0.25s ease, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .ag-nav:hover .ag-nav-icon,
  .ag-nav:focus-visible .ag-nav-icon {
    opacity: 1;
    transform: none;
  }

  .ag-nav:active .ag-nav-icon {
    transform: scale(0.9);
  }

  /* touch screens: no hover, so the arrows stay faintly visible (swiping still works too) */
  @media (hover: none) {
    .ag-nav-icon {
      opacity: 0.6;
      transform: none;
    }
  }

  @keyframes ag-shimmer {
    from { background-position: 120% 0; }
    to { background-position: -120% 0; }
  }

  @keyframes ag-rot {
    to { transform: rotate(360deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .ag-thumb::after,
    .ag-spin,
    .ag-big-in,
    .ag-paper-in {
      animation: none;
    }

    /* no slide, so the photo underneath is simply swapped out */
    .ag-under.is-covered {
      animation: none;
      display: none;
    }
  }
`;
