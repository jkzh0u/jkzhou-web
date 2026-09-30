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
const getColumnCount = () => (window.matchMedia("(min-width: 640px)").matches ? 3 : 2);
const getServerColumnCount = () => 3;

const THUMB_SIZES = "(max-width: 640px) 50vw, 33vw";
// The first row is what people see first, so only it gets priority
const PRIORITY_COUNT = 3;

// Same order as Finder's "sort by name": numbers compare by value
// (2 before 10) and case is ignored. A fixed locale keeps the order
// identical on the server and in the browser, so hydration never mismatches.
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
  return (
    <button
      type="button"
      onClick={() => onSelect(src)}
      aria-label={`Open ${alt}`}
      className="group block w-full overflow-hidden text-left"
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
        className="
          h-auto w-full
          transition-[transform,filter] duration-500 ease-out
          group-hover:scale-[1.015] group-hover:brightness-105
          motion-reduce:transition-none
        "
      />
    </button>
  );
});

export default function AlbumGallery({ album }: { album: Album }) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const columnCount = useSyncExternalStore(
    subscribe,
    getColumnCount,
    getServerColumnCount
  );

  // Masonry with left-to-right order: 1 2 3 across the top, then 4 5 6
  // continue under them in each column. Heights stay mismatched.
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
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setSelectedPhoto(src);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    closeTimer.current = window.setTimeout(() => setSelectedPhoto(null), 300);
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
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <>
      <div className="flex items-start gap-5">
        {columns.map((col, c) => (
          <div key={c} className="flex min-w-0 flex-1 flex-col gap-5">
            {col.map(({ photo, index }) => (
              <Thumb
                key={photo}
                src={`/photos/${album.slug}/${encodeURIComponent(photo)}`}
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
            ${visible ? "opacity-100 backdrop-blur-xl" : "opacity-0 backdrop-blur-none"}
          `}
        >
          <Image
            src={selectedPhoto}
            alt={`${album.title} enlarged photo`}
            width={2400}
            height={1600}
            sizes="82vw"
            className={`
              h-auto max-h-[88vh] w-auto max-w-[82vw] object-contain shadow-2xl
              transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
              motion-reduce:transition-none
              ${visible ? "scale-100 opacity-100" : "scale-95 opacity-0"}
            `}
          />
        </div>
      )}
    </>
  );
}