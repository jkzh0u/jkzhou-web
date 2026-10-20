"use client";

import { useEffect } from "react";
import VideoPlayer from "./VideoPlayer";

export interface VideoItem {
  title: string;
  tag: string;
  year: string;
  src: string;
  poster: string;
  desc: string;
  aspectRatio?: number;
}

export default function VideoModal({
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