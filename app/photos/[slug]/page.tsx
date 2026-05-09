import { notFound } from "next/navigation";
import { albums } from "@/data/albums";
import AlbumGallery from "../../components/AlbumGallery";
import fs from "fs";
import path from "path";

export function generateStaticParams() {
  return albums.map((album) => ({
    slug: album.slug,
  }));
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const album = albums.find((album) => album.slug === slug);

  if (!album) {
    notFound();
  }

  const photosDirectory = path.join(
    process.cwd(),
    "public",
    "photos",
    album.slug
  );

const photos = fs.existsSync(photosDirectory)
  ? fs
      .readdirSync(photosDirectory)
      .filter((file) =>
        [".jpg", ".jpeg", ".png", ".webp"].includes(
          path.extname(file).toLowerCase()
        )
      )
  : [];

  return (
    <div className="px-4 sm:px-8 lg:px-28">
      <p className="text-5xl font-bold mt-7">{album.title}</p>
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