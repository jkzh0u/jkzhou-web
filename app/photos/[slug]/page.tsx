import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { albums } from "@/data/albums";
import AlbumGallery from "../../components/AlbumGallery";
import AlbumGridSkeleton from "./AlbumGridSkeleton";
import { getAlbumPhotos, getPhotoUrl } from "@/lib/r2";

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

  return {
    title: album.title,
    description: `${album.subtitle}. photos by jackson zhou.`,
  };
}

async function AlbumPhotos({ album }: { album: Album }) {
  const filenames = await getAlbumPhotos(album.slug);
  const photos = filenames.map((filename) => getPhotoUrl(album.slug, filename));

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
      <p className="load-reveal text-5xl font-bold">{album.title}</p>

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
