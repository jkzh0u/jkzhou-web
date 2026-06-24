"use client";

import { useEffect, useState } from "react";
import VideoPlayer from "../components/VideoPlayer";

export interface VideoItem {
  title: string;
  tag: string;
  year: string;
  src: string;
  poster: string;
  desc: string;
  aspectRatio?: number;
}

interface VideoGalleryProps {
  videos: VideoItem[];
}

function VideoModal({
  video,
  onClose,
}: {
  video: VideoItem;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 px-4 py-5 text-white backdrop-blur-xl">
      <button
        onClick={onClose}
        className="absolute right-5 top-5 z-20 rounded-[10px] border border-white/10 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
      >
        close
      </button>

      <div className="flex min-h-full items-center justify-center">
        <div className="w-full max-w-6xl">
          <VideoPlayer
            src={video.src}
            poster={video.poster}
            aspectRatio={video.aspectRatio}
            autoplay
          />

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                {video.tag} / {video.year}
              </p>

              <h2 className="mt-2 text-4xl font-bold tracking-tight md:text-6xl">
                {video.title}
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55 md:text-base">
                {video.desc}
              </p>
            </div>

            <p className="hidden text-right text-xs uppercase tracking-[0.3em] text-white/25 md:block">
              now playing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilmCard({
  video,
  number,
  onClick,
}: {
  video: VideoItem;
  number: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group grid w-full grid-cols-1 overflow-hidden rounded-[18px] border border-foreground/10 bg-foreground/[0.025] text-left transition-all duration-500 hover:border-foreground/25 hover:bg-foreground/[0.045] md:grid-cols-[0.9fr_1.1fr]"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-black md:aspect-auto">
        <img
          src={video.poster}
          alt=""
          className="h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-100"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent md:bg-gradient-to-r md:from-black/20 md:via-transparent md:to-transparent" />

        <div className="absolute left-4 top-4 rounded-[9px] border border-white/15 bg-black/25 px-3 py-1 text-xs uppercase tracking-[0.25em] text-white/75 backdrop-blur-md">
          {String(number).padStart(2, "0")}
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-500 group-hover:opacity-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-white text-xl text-black shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            ▶
          </div>
        </div>
      </div>

      <div className="flex min-h-[230px] flex-col justify-between p-6 md:p-7">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-foreground/35">
            {video.tag} / {video.year}
          </p>

          <h3 className="mt-4 text-4xl font-bold leading-none tracking-tight md:text-5xl">
            {video.title}
          </h3>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-foreground/50">
            {video.desc}
          </p>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-foreground/10 pt-4">
          <p className="text-xs uppercase tracking-[0.28em] text-foreground/30">
            watch
          </p>

          <span className="text-2xl text-foreground/35 transition duration-500 group-hover:translate-x-1 group-hover:text-foreground">
            →
          </span>
        </div>
      </div>
    </button>
  );
}

export default function VideoGallery({ videos }: VideoGalleryProps) {
  const [selected, setSelected] = useState<VideoItem | null>(null);

  // Reverse so newest (last in JSON) appears first, but keep original 1-based numbering
  const reversed = [...videos].reverse();

  return (
    <>
      {selected && (
        <VideoModal video={selected} onClose={() => setSelected(null)} />
      )}

      <div className="space-y-5">
        {reversed.map((video, index) => (
          <FilmCard
            key={video.title}
            video={video}
            number={videos.length - index}
            onClick={() => setSelected(video)}
          />
        ))}
      </div>
    </>
  );
}