import { promises as fs } from "fs";
import path from "path";
import VideoGallery, { type VideoItem } from "../components/VideoGallery";

async function getVideos(): Promise<VideoItem[]> {
  const filePath = path.join(process.cwd(), "public", "videos", "videos.json");
  const file = await fs.readFile(filePath, "utf-8");
  return JSON.parse(file);
}

export const dynamic = "force-dynamic"; // always re-read the file, never cache

export default async function VideosPage() {
  const videos = await getVideos();

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <section className="mx-auto w-full max-w-7xl px-4 py-24">
        <div className="relative mb-20">
          <p className="mb-5 text-sm uppercase tracking-[0.45em] text-foreground/35">
            moving images
          </p>

          <h1 className="text-[clamp(4.5rem,14vw,12rem)] font-bold leading-[0.78] tracking-tight">
            video
            vault
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-foreground/50">
            this page is still under construction, but here are a few videos i've made. more to come soon!
          </p>
        </div>

        <VideoGallery videos={videos} />
      </section>
    </main>
  );
}