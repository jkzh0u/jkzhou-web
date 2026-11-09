import type { Metadata } from "next";
import { getR2Url } from "@/lib/r2";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const DEFAULT_IMAGE = getR2Url("homepage/bluecntower.jpg");

// Originals can be over 10MB, too big for link previews, so serve a resized copy.
function previewImageUrl(src: string): string {
  return `${SITE_URL}/_next/image?url=${encodeURIComponent(src)}&w=1200&q=75`;
}

type PageSeo = {
  title: string;
  description: string;
  /** Path from the site root, e.g. "/photos" */
  path: string;
  /** Full image URL for link previews */
  image?: string;
  /** Use the title as written, without the site name after it */
  absoluteTitle?: boolean;
};

// Next replaces nested metadata objects per page instead of merging them, so each
// page needs the complete openGraph block. It also ignores the layout's title
// template inside openGraph, which is why the full title is built here.
export function pageMetadata({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  absoluteTitle = false,
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
      images: [{ url: previewImageUrl(image), alt: fullTitle }],
    },
    // X falls back to the openGraph title, description and image
    twitter: { card: "summary_large_image" },
  };
}
