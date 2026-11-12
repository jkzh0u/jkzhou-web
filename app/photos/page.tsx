import type { Metadata } from "next";
import AlbumIndex from "../components/AlbumIndex";
import AlbumBanner, { type BannerPhoto } from "../components/AlbumBanner";
import { albums } from "@/data/albums";
import { getR2Url } from "@/lib/r2";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "photos",
  description:
    "photo albums by jackson zhou: concerts, school events, robotics and more!",
  path: "/photos",
});

const bannerPhotos: BannerPhoto[] = albums.map((album) => ({
  href: `/photos/${album.slug}`,
  image: getR2Url(`photos/${album.slug}/${album.cover}`),
}));

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip bg-background text-foreground">
      <h1 className="sr-only">jackson zhou&apos;s photo vault: life through my lens</h1>
      <header className="pt-12">
        <AlbumBanner photos={bannerPhotos} />
      </header>
      <AlbumIndex />
    </main>
  );
}
