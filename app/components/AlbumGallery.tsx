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

type Album = {
  slug: string;
  title: string;
  photos: readonly string[];
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
  alt,
  priority,
  onSelect,
}: {
  src: string;
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
        // Only sets the aspect ratio placeholder; h-auto lets the real photo
        // keep its natural shape, which gives the mismatched masonry look.
        width={1600}
        height={1067}
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
  const [bigLoaded, setBigLoaded] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const columnCount = useSyncExternalStore(
    subscribe,
    getColumnCount,
    getServerColumnCount
  );

  // Masonry with left-to-right order: 1 2 3 across the top, then 4 5 6.
  // Heights stay mismatched.
  const columns = useMemo(() => {
    const cols: { photo: string; index: number }[][] = Array.from(
      { length: columnCount },
      () => []
    );

    const sorted = [...album.photos].sort(finderCollator.compare);

    sorted.forEach((photo, index) => {
      cols[index % columnCount].push({ photo, index });
    });

    return cols;
  }, [album.photos, columnCount]);

  const open = useCallback((src: string) => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }

    setVisible(false);
    setBigLoaded(false);
    setSelectedPhoto(src);
  }, []);

  const close = useCallback(() => {
    setVisible(false);

    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
    }

    closeTimer.current = window.setTimeout(() => {
      setSelectedPhoto(null);
      closeTimer.current = null;
    }, 300);
  }, []);

  // Fade in after mount, and close on Escape
  useEffect(() => {
    if (!selectedPhoto) return;

    let raf2 = 0;

    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setVisible(true));
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedPhoto, close]);

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
                key={photo}
                // R2 URLs are passed directly from AlbumPage.
                src={photo}
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
          data-lenis-prevent
          onClick={close}
          className={`
            fixed inset-0 z-50 flex items-center justify-center
            bg-black/40 p-4
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
          <Image
            src={selectedPhoto}
            alt={`${album.title} enlarged photo`}
            width={2400}
            height={1600}
            sizes="82vw"
            onLoad={() => setBigLoaded(true)}
            onError={() => setBigLoaded(true)}
            className={`
              h-auto max-h-[88vh] w-auto max-w-[82vw] object-contain shadow-2xl
              transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
              motion-reduce:transition-none
              ${
                visible && bigLoaded
                  ? "scale-100 opacity-100"
                  : "scale-95 opacity-0"
              }
            `}
          />
        </div>
      )}
    </>
  );
}

const css = `
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

  @keyframes ag-shimmer {
    from { background-position: 120% 0; }
    to { background-position: -120% 0; }
  }

  @keyframes ag-rot {
    to { transform: rotate(360deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .ag-thumb::after,
    .ag-spin {
      animation: none;
    }
  }
`;
