import Image from "next/image";
import type { Metadata } from "next";
import PhotosShowcase from "../components/PhotosShowcase";

export const metadata: Metadata = {
  title: "jackson zhou: photos",
  description: "Homepage",
};

export default function Home() {
  return (
<main className="min-h-screen overflow-hidden bg-background text-foreground">
  <section className="mx-auto w-full max-w-7xl px-4">
    <div className="relative">
      <p className="mb-5 text-sm uppercase tracking-[0.45em] text-foreground/35">
        images
      </p>

      <h1 className="text-[clamp(4.5rem,14vw,12rem)] font-bold leading-[0.78] tracking-tight">
        photo
        vault
      </h1>

      <p className="mt-8 max-w-xl text-lg leading-relaxed text-foreground/50">
        my photography work. I hope you enjoy browsing through my collection of images.
      </p>
    </div>
  </section>

  <section className="-mx-4 sm:-mx-8 lg:-mx-28">
    <PhotosShowcase />
  </section>
</main>
  );
}