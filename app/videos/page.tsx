import { promises as fs } from "fs";
import path from "path";
import type { Metadata } from "next";
import VideosView from "../components/VideosView";
import type { ReelVideo } from "../components/VideoReel";

export const metadata: Metadata = {
  title: "jackson zhou: videos",
  description: "vlogs and short films by jackson zhou.",
};

async function getVideos(): Promise<ReelVideo[]> {
  const filePath = path.join(process.cwd(), "public", "videos.json");
  const fileContents = await fs.readFile(filePath, "utf8");
  return JSON.parse(fileContents) as ReelVideo[];
}

export const dynamic = "force-dynamic"; // always re-read the file, never cache

export default async function VideosPage() {
  const videos = (await getVideos()).reverse();

  return (
    <main className="bg-background text-foreground">
      <h1 className="sr-only">video vault</h1>
      <VideosView videos={videos} />
    </main>
  );
}
