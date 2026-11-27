import type { Metadata } from "next";
import PhotoField, { type FieldAlbum, type FieldPhoto } from "../components/PhotoField";
import { albums } from "@/data/albums";
import { getAlbumPhotos, getPhotoUrl } from "@/lib/r2";
import { getImageSize } from "@/lib/imageSize";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "photos",
  description:
    "photo albums by jackson zhou: concerts, school events, robotics and more!",
  path: "/photos",
});

// album folders are re-listed at most once an hour (same as the album pages)
export const revalidate = 3600;

// `field` is optional in data/albums.ts, so not every album's type has it
const fieldList = (album: (typeof albums)[number]) =>
  (album as { field?: readonly string[] }).field ?? [];

const stripExt = (f: string) => f.replace(/\.[^./]+$/, "").toLowerCase();

// The hand-picked photos that exist in the album's folder. A name without an extension
// ("IMG_2645") matches the file whatever its extension is. If the folder couldn't be listed,
// names are used as written (".jpg" added when there's no extension).
function handPicked(slug: string, picks: readonly string[], cover: string, files: string[] | null) {
  const byBase = new Map((files ?? []).map((f) => [stripExt(f), f]));
  const inFolder = new Set(files ?? []);
  const resolved: string[] = [];
  const missing: string[] = [];

  for (const pick of picks) {
    const name = pick.trim();
    const hasExt = /\.[^./]+$/.test(name);
    const file = !files
      ? hasExt ? name : `${name}.jpg`
      : inFolder.has(name)
        ? name
        : byBase.get(stripExt(name));
    if (file) resolved.push(file);
    else missing.push(name);
  }

  if (missing.length) {
    console.warn(`[photos] ${slug}: not in the album folder, skipped: ${missing.join(", ")}`);
  }
  return [...new Set(resolved)].filter((f) => f !== cover);
}

// what the field shows: each album's cover plus its hand-picked `field` photos
async function fieldPhotos(): Promise<FieldPhoto[]> {
  // folders are only listed to check hand-picked filenames, so skip albums without any
  const lists = await Promise.allSettled(
    albums.map((a) => (fieldList(a).length ? getAlbumPhotos(a.slug) : Promise.resolve(null)))
  );

  const picked = albums.flatMap((album, i) => {
    const listed = lists[i];
    const files = listed.status === "fulfilled" ? listed.value : null;
    const extras = handPicked(album.slug, fieldList(album), album.cover, files);
    return [album.cover, ...extras].map((file) => ({
      src: getPhotoUrl(album.slug, file),
      album: i,
    }));
  });

  // each photo keeps its own shape in the field
  const sizes = await Promise.all(picked.map((p) => getImageSize(p.src)));
  return picked.map((p, i) => {
    const size = sizes[i];
    return { ...p, ratio: size ? size.width / size.height : null };
  });
}

export default async function PhotosPage() {
  const fieldAlbums: FieldAlbum[] = albums.map((album) => ({
    href: `/photos/${album.slug}`,
    title: album.title,
    subtitle: album.subtitle,
  }));

  return (
    <main className="bg-background text-foreground">
      <PhotoField albums={fieldAlbums} photos={await fieldPhotos()} />
    </main>
  );
}
