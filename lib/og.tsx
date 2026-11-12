import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

type Card = {
  /** Small label above the title, e.g. "photos" */
  section?: string;
  title: string;
  description?: string;
  /** Absolute URL, or a path from /public like "/projects/sdr.jpg" */
  image?: string;
};

const PHOTO_WIDTH = 440;

// Originals can be over 10MB, so fetch a resized JPEG through Next's image optimizer.
// Asking for image/jpeg stops it from returning WebP/AVIF, which the renderer can't read.
async function loadPhoto(src: string): Promise<string | null> {
  try {
    // Files in /public are read from disk, so a new image works before it is deployed
    if (src.startsWith("/")) {
      const data = await readFile(path.join(process.cwd(), "public", src));
      const type = src.endsWith(".png") ? "image/png" : "image/jpeg";
      return `data:${type};base64,${data.toString("base64")}`;
    }
    const url = `${SITE_URL}/_next/image?url=${encodeURIComponent(src)}&w=640&q=75`;
    const res = await fetch(url, { headers: { Accept: "image/jpeg" } });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    const data = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:${type};base64,${data}`;
  } catch {
    return null;
  }
}

async function loadFont(weight: 400 | 600): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      `https://cdn.jsdelivr.net/fontsource/fonts/inter@5.1.0/latin-${weight}-normal.woff`,
    );
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export async function renderCard({ section, title, description, image }: Card) {
  const [photo, regular, semibold] = await Promise.all([
    image ? loadPhoto(image) : null,
    loadFont(400),
    loadFont(600),
  ]);

  const fonts = [
    regular && { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
    semibold && { name: "Inter", data: semibold, weight: 600 as const, style: "normal" as const },
  ].filter((f) => !!f);

  const host = new URL(SITE_URL).host;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#ffffff",
          color: "#0a0a0a",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 72px",
          }}
        >
          <div style={{ display: "flex", fontSize: 26, color: "#525252" }}>
            {SITE_NAME}
            {section ? ` / ${section}` : ""}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div
              style={{
                display: "flex",
                fontSize: title.length > 24 ? 64 : 80,
                fontWeight: 600,
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
              }}
            >
              {clip(title, 48)}
            </div>
            {description ? (
              <div style={{ display: "flex", fontSize: 30, lineHeight: 1.35, color: "#525252" }}>
                {clip(description, photo ? 130 : 180)}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", fontSize: 24, color: "#a3a3a3" }}>{host}</div>
        </div>

        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            width={PHOTO_WIDTH}
            height={ogSize.height}
            style={{ width: PHOTO_WIDTH, height: ogSize.height, objectFit: "cover" }}
            alt=""
          />
        ) : null}
      </div>
    ),
    { ...ogSize, fonts: fonts.length ? fonts : undefined },
  );
}
