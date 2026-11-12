import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";

type PageSeo = {
  title: string;
  description: string;
  /** Path from the site root, e.g. "/photos" */
  path: string;
  /** Video for link previews (path from the site root; Next does not resolve og:video against metadataBase, so it is made absolute here), played inline by apps like iMessage and Discord */
  video?: { url: string; width: number; height: number };
  /** Use the title as written, without the site name after it */
  absoluteTitle?: boolean;
};

// Link preview images come from the opengraph-image.tsx files (see lib/og.tsx).
// Next replaces nested metadata objects per page instead of merging them, so each
// page needs the complete openGraph block. It also ignores the layout's title
// template inside openGraph, which is why the full title is built here.
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  video,
}: PageSeo): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} · ${SITE_NAME}`;

  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_CA",
      url: path,
      title: fullTitle,
      description,
      ...(video && { videos: [{ ...video, url: new URL(video.url, SITE_URL).toString(), type: "video/mp4" }] }),
    },
    // X falls back to the openGraph title, description and image
    twitter: { card: "summary_large_image" },
  };
}
