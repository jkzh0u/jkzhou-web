import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
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

// Loads the photo and shrinks it here, since originals can be over 10MB. It never goes through
// the site itself: some cards are rendered during the build, when the site may be down.
// Files in /public are read from disk; anything else is downloaded directly (e.g. from R2).
async function loadPhoto(src: string): Promise<string | null> {
  try {
    let input: Buffer;
    if (src.startsWith("/")) {
      input = await readFile(path.join(process.cwd(), "public", src));
    } else {
      const res = await fetch(src);
      if (!res.ok) {
        console.error(`og: ${res.status} loading ${src}`);
        return null;
      }
      input = Buffer.from(await res.arrayBuffer());
    }
    // PNG keeps transparency (the SDR render); photos become JPEG
    const resized = sharp(input).rotate().resize({ width: PHOTO_WIDTH * 2, withoutEnlargement: true });
    const png = src.endsWith(".png");
    const data = await (png ? resized.png() : resized.jpeg({ quality: 80 })).toBuffer();
    return `data:image/${png ? "png" : "jpeg"};base64,${data.toString("base64")}`;
  } catch (error) {
    console.error(`og: failed to load ${src}`, error);
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
