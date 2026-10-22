
import "server-only";

import {
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

import { unstable_cache } from "next/cache";

export const r2PublicUrl = (
  process.env.R2_PUBLIC_URL || "https://assets.jkzhou.ca"
).replace(/\/+$/, "");

const imageExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucketName
  ) {
    throw new Error(
      "Missing required R2 environment variables. " +
        "Check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
        "R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME."
    );
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, bucketName };
}

/**
 * Lists images directly inside an R2 folder.
 * Ignores hidden files and nested folders.
 */
async function listImagesInFolder(
  folder: string
): Promise<string[]> {
  const { client, bucketName } = getR2Config();

  const photos: string[] = [];
  let continuationToken: string | undefined;

  const prefix = `${folder.replace(/^\/+|\/+$/g, "")}/`;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    for (const object of response.Contents ?? []) {
      if (!object.Key) continue;

      const filename = object.Key.slice(prefix.length);

      // Only include images directly inside this folder.
      if (!filename || filename.includes("/")) continue;
      if (filename.startsWith(".")) continue;

      const dotIndex = filename.lastIndexOf(".");
      if (dotIndex === -1) continue;

      const extension = filename.slice(dotIndex).toLowerCase();

      if (imageExtensions.has(extension)) {
        photos.push(filename);
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return photos.sort((a, b) =>
    a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );
}

/**
 * Gets photos from photos/<slug>/.
 * Cached and revalidated after one hour.
 */
export const getAlbumPhotos = unstable_cache(
  async (slug: string): Promise<string[]> => {
    return listImagesInFolder(`photos/${slug}`);
  },
  ["r2-album-photos"],
  {
    revalidate: 3600,
  }
);

const R2_PUBLIC_URL = "https://assets.jkzhou.ca";

export function getR2Url(path: string): string {
  return `${R2_PUBLIC_URL}/${path.replace(/^\/+/, "")}`;
}

/**
 * Generates a public URL for an R2 image.
 *
 * Album:
 * getPhotoUrl("wave2earth2026", "1.jpg")
 *
 * Homepage:
 * getPhotoUrl("", "hero.jpg", "homepage")
 */
export function getPhotoUrl(
  slug: string,
  filename: string,
  folder = "photos"
): string {
  const safeFolder = folder
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const safeSlug = slug
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");

  const safeFilename = filename
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const path = safeSlug
    ? `${safeFolder}/${safeSlug}/${safeFilename}`
    : `${safeFolder}/${safeFilename}`;

  return `${r2PublicUrl}/${path}`;
}
