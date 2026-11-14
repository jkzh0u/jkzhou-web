import type { MetadataRoute } from "next";
import { albums } from "@/data/albums";
import { projects } from "@/data/projects";
import { SITE_URL } from "@/lib/site";
import { getVideos } from "@/lib/videos";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/photos`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/videos`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/projects`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.5 },
  ];

  const albumPages: MetadataRoute.Sitemap = albums.map((album) => ({
    url: `${SITE_URL}/photos/${album.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const projectPages: MetadataRoute.Sitemap = projects.flatMap((project) =>
    project.slug
      ? [{ url: `${SITE_URL}/projects/${project.slug}`, changeFrequency: "monthly" as const, priority: 0.7 }]
      : [],
  );

  const videoPages: MetadataRoute.Sitemap = (await getVideos()).map((video) => ({
    url: `${SITE_URL}/videos/${video.slug}`,
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [...pages, ...albumPages, ...projectPages, ...videoPages];
}
