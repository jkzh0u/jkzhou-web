import type { Metadata } from "next";
import PhotosShowcase from "../components/PhotosShowcase";
import PhotoBillboard, { type BillboardPhoto } from "../components/PhotoBillboard";
import { albums } from "@/data/albums";
import { getR2Url } from "@/lib/r2";

export const metadata: Metadata = {
  title: "jackson zhou: photos",
  description:
    "photos by jackson zhou: concerts, school events, robots and friends around toronto.",
};

const billboardPhotos: BillboardPhoto[] = albums.map((album) => ({
  href: `/photos/${album.slug}`,
  image: getR2Url(`photos/${album.slug}/${album.cover}`),
}));

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip bg-background text-foreground">
      <h1 className="sr-only">photo vault: life through my lens</h1>
      <header className="pt-12">
        <PhotoBillboard photos={billboardPhotos} />
      </header>
      <PhotosShowcase />
    </main>
  );
}
