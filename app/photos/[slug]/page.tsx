
import { notFound } from "next/navigation";
import { albums } from "@/data/albums";
import AlbumGallery from "../../components/AlbumGallery";
import { getAlbumPhotos, getPhotoUrl } from "@/lib/r2";
import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "jackson zhou.",
  description: "photos",
};

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const album = albums.find((item) => item.slug === slug);

  if (!album) {
    notFound();
  }

  const filenames = await getAlbumPhotos(album.slug);

  const photos = filenames.map((filename) =>
    getPhotoUrl(album.slug, filename)
  );

  console.log("Album slug:", album.slug);
  console.log("R2 filenames:", filenames);
  console.log("Photo URLs:", photos);

  return (
    <div className="px-4 sm:px-8 lg:px-28">
      <p className="mt-7 text-5xl font-bold">{album.title}</p>

      <p className="mb-7 text-neutral-600 dark:text-neutral-400">
        {album.subtitle}
      </p>

      <AlbumGallery
        album={{
          ...album,
          photos,
        }}
      />
    </div>
  );
}
