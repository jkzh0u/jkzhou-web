import type { MetadataRoute } from "next";
import { albums } from "@/data/albums";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/photos`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/videos`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.5 },
  ];

  const albumPages: MetadataRoute.Sitemap = albums.map((album) => ({
    url: `${SITE_URL}/photos/${album.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...pages, ...albumPages];
}
