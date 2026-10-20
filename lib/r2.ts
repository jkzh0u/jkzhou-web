
import "server-only";

import {
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

import { unstable_cache } from "next/cache";


const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  throw new Error("Missing required R2 environment variables.");
}

export const r2PublicUrl = (
  process.env.R2_PUBLIC_URL || "https://assets.jkzhou.ca"
).replace(/\/+$/, "");

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const imageExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);


export const getAlbumPhotos = unstable_cache(
  async (slug: string): Promise<string[]> => {
    const photos: string[] = [];
    let continuationToken: string | undefined;
    const prefix = `photos/${slug}/`;

    do {
      const response = await r2.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );

      for (const object of response.Contents ?? []) {
        if (!object.Key) continue;

        const filename = object.Key.slice(prefix.length);

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
  },
  ["r2-album-photos"],
  {
    revalidate: 3600,
  }
);



export function getPhotoUrl(
  slug: string,
  filename: string
): string {
  const safeSlug = slug
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const safeFilename = filename
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `${r2PublicUrl}/photos/${safeSlug}/${safeFilename}`;
}
