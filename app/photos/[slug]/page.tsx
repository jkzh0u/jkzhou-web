import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { albums } from "@/data/albums";
import AlbumGallery from "../../components/AlbumGallery";
import AlbumGridSkeleton from "./AlbumGridSkeleton";
import { getAlbumPhotos, getPhotoUrl } from "@/lib/r2";
import { getImageSize } from "@/lib/imageSize";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Album = (typeof albums)[number];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const album = albums.find((a) => a.slug === slug);

  if (!album) return { title: "album not found" };

  return pageMetadata({
    title: album.metaTitle,
    description: album.metaDescription,
    path: `/photos/${album.slug}`,
  });
}

async function AlbumPhotos({ album }: { album: Album }) {
  const filenames = await getAlbumPhotos(album.slug);
  const urls = filenames.map((filename) => getPhotoUrl(album.slug, filename));
  // each photo's real shape, so its space is held before it loads and nothing shifts
  const sizes = await Promise.all(urls.map((src) => getImageSize(src)));
  const photos = urls.map((src, i) => ({
    src,
    width: sizes[i]?.width ?? 1600,
    height: sizes[i]?.height ?? 1067,
  }));

  return <AlbumGallery album={{ ...album, photos }} />;
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const album = albums.find((a) => a.slug === slug);

  if (!album) notFound();

  return (
    <div className="px-4 pt-24 sm:px-8 sm:pt-28 lg:px-28 lg:pt-32">
      <h1 className="load-reveal text-5xl font-bold">{album.title}</h1>

      <p
        className="load-reveal mb-7 text-neutral-600 dark:text-neutral-400"
        style={{ animationDelay: "0.12s" }}
      >
        {album.subtitle}
      </p>

      <Suspense fallback={<AlbumGridSkeleton />}>
        <AlbumPhotos album={album} />
      </Suspense>
    </div>
  );
}
