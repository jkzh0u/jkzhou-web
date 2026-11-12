import { albums } from "@/data/albums";
import { renderCard } from "@/lib/og";
import { getPhotoUrl } from "@/lib/r2";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "photo album by jackson zhou";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const album = albums.find((a) => a.slug === slug);

  if (!album) return renderCard({ section: "photos", title: "album not found" });

  return renderCard({
    section: "photos",
    title: album.title,
    description: album.metaDescription,
    image: getPhotoUrl(album.slug, album.cover),
  });
}
