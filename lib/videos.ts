import "server-only";

import { promises as fs } from "fs";
import path from "path";
import type { ReelVideo } from "@/app/components/VideoReel";

/** One entry in public/videos.json. `slug` is optional: it is made from the title when left out. */
type VideoEntry = Omit<ReelVideo, "slug"> & { slug?: string };

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Videos in display order (newest first, the reverse of videos.json), each with a slug for
 * its page at /videos/[slug]. Renaming a title changes its slug, so set `slug` in the JSON
 * to keep an old link working.
 */
export async function getVideos(): Promise<ReelVideo[]> {
  const filePath = path.join(process.cwd(), "public", "videos.json");
  const entries = JSON.parse(await fs.readFile(filePath, "utf8")) as VideoEntry[];

  const used = new Set<string>();
  const videos = entries.map((entry) => {
    const base = entry.slug || slugify(entry.title) || "video";
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    return { ...entry, slug };
  });

  return videos.reverse();
}
