import type { Metadata } from "next";
import VideosView from "../components/VideosView";
import { pageMetadata } from "@/lib/seo";
import { getVideos } from "@/lib/videos";

export const metadata: Metadata = pageMetadata({
  title: "videos",
  description: "vlogs and short films created by me.",
  path: "/videos",
});

export const dynamic = "force-dynamic"; // always re-read the file, never cache

export default async function VideosPage() {
  const videos = await getVideos();

  return (
    <main className="bg-background text-foreground">
      <h1 className="sr-only">jackson zhou&apos;s video vault: vlogs and short films</h1>
      <VideosView videos={videos} />
    </main>
  );
}
