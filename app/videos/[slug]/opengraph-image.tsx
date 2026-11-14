import { renderCard } from "@/lib/og";
import { getVideos } from "@/lib/videos";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "video by jackson zhou";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const video = (await getVideos()).find((v) => v.slug === slug);

  if (!video) return renderCard({ section: "videos", title: "video not found" });

  return renderCard({
    section: `videos / ${video.tag}`,
    title: video.title,
    description: video.desc,
    image: video.poster,
  });
}
