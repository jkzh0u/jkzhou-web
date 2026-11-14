import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { getVideos } from "@/lib/videos";

// Same as /videos: videos.json is read on every request
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

async function findVideo(slug: string) {
  const videos = await getVideos();
  const index = videos.findIndex((video) => video.slug === slug);
  if (index === -1) return null;
  return {
    video: videos[index],
    // display order is newest first, so "previous" is the newer one
    newer: videos[index - 1],
    older: videos[index + 1],
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const found = await findVideo(slug);
  if (!found) return { title: "video not found" };

  const { video } = found;
  const ratio = video.aspectRatio ?? 16 / 9;
  return pageMetadata({
    title: video.title,
    description: video.desc || `${video.tag} by jackson zhou`,
    path: `/videos/${video.slug}`,
    // played inline by link previews in apps like iMessage and Discord
    video: { url: video.src, width: 1200, height: Math.round(1200 / ratio) },
  });
}

export default async function VideoPage({ params }: Params) {
  const { slug } = await params;
  const found = await findVideo(slug);
  if (!found) notFound();

  const { video, newer, older } = found;
  const ratio = video.aspectRatio ?? 16 / 9;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.desc || video.title,
    thumbnailUrl: video.poster,
    contentUrl: video.src,
    uploadDate: video.year,
    url: `${SITE_URL}/videos/${video.slug}`,
    creator: { "@id": `${SITE_URL}/#person` },
  };

  return (
    <main className="min-h-screen bg-background px-4 pt-24 pb-24 text-foreground sm:px-8 sm:pt-28 lg:px-20 lg:pt-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="mx-auto max-w-5xl">
        <Link
          href="/videos"
          className="load-reveal inline-flex items-center gap-1.5 text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          all videos
        </Link>

        {/* Tall videos are capped at most of the screen and letterboxed */}
        <div
          className="media-reveal mt-6 w-full overflow-hidden bg-black"
          style={{ aspectRatio: ratio, maxHeight: "80svh", animationDelay: "0.1s" }}
        >
          <video
            src={video.src}
            poster={video.poster}
            controls
            playsInline
            preload="metadata"
            aria-label={video.title}
            className="h-full w-full object-contain"
          />
        </div>

        <div className="load-reveal mt-8" style={{ animationDelay: "0.2s" }}>
          <p className="text-sm tracking-wide text-neutral-400 uppercase">
            {video.tag} · {video.year}
          </p>
          <h1 className="mt-2 text-3xl font-semibold">{video.title}</h1>
          {video.desc && (
            <p className="mt-3 text-lg leading-relaxed text-neutral-500">{video.desc}</p>
          )}
        </div>

        {(newer || older) && (
          <nav
            aria-label="more videos"
            className="load-reveal mt-16 grid grid-cols-2 gap-6 border-t border-neutral-200 pt-6"
            style={{ animationDelay: "0.3s" }}
          >
            {newer ? (
              <Link href={`/videos/${newer.slug}`} className="group min-w-0">
                <span className="inline-flex items-center gap-1 text-sm text-neutral-400">
                  <ArrowLeft className="size-3.5" aria-hidden="true" /> newer
                </span>
                <span className="mt-1 block truncate text-lg text-neutral-700 transition-colors group-hover:text-neutral-950">
                  {newer.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {older && (
              <Link href={`/videos/${older.slug}`} className="group min-w-0 text-right">
                <span className="inline-flex items-center gap-1 text-sm text-neutral-400">
                  older <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
                <span className="mt-1 block truncate text-lg text-neutral-700 transition-colors group-hover:text-neutral-950">
                  {older.title}
                </span>
              </Link>
            )}
          </nav>
        )}
      </div>
    </main>
  );
}
