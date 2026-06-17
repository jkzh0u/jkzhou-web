"use client";

import { useEffect, useRef } from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoplay?: boolean;
  /** width / height, e.g. 16 / 9 (default) or 3 / 2 for your footage */
  aspectRatio?: number;
}

export default function VideoPlayer({
  src,
  poster,
  autoplay = true,
  aspectRatio = 16 / 9,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // create a fresh <video> element ourselves and mount it — avoids React
    // and video.js fighting over the same DOM node, which causes a blank
    // player with no console error
    const videoEl = document.createElement("video");
    videoEl.className = "video-js vjs-big-play-centered vjs-default-skin";
    videoEl.setAttribute("playsinline", "true");
    containerRef.current.appendChild(videoEl);
    videoRef.current = videoEl;

    const player = videojs(videoEl, {
      controls: true,
      autoplay,
      preload: "auto",
      fluid: false,
      fill: true,
      responsive: true,
      poster,
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
      sources: [{ src, type: "video/mp4" }],
    });

    playerRef.current = player;

    return () => {
      playerRef.current?.dispose();
      playerRef.current = null;
      videoRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [src, poster, autoplay]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl bg-black shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
      style={{ aspectRatio }}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}