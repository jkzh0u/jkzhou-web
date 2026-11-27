import "server-only";

import { unstable_cache } from "next/cache";

// Reads an image's displayed width and height from the start of the file, without downloading
// or decoding the whole thing. Handles JPEG (including EXIF rotation, which next/image applies,
// so a portrait phone photo stored sideways comes back as portrait), PNG and WebP.

export type ImageSize = { width: number; height: number };

const HEAD_BYTES = 128 * 1024; // enough for the header of nearly every JPEG, EXIF thumbnail included

function jpegSize(b: Uint8Array): ImageSize | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let orientation = 1;
  let i = 2;

  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xff) {
      i++; // fill byte
      continue;
    }
    // markers with no length
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2;
      continue;
    }
    const len = view.getUint16(i + 2);

    // EXIF: look for the orientation tag in the first image directory
    if (marker === 0xe1 && b[i + 4] === 0x45 && b[i + 5] === 0x78 && b[i + 6] === 0x69 && b[i + 7] === 0x66) {
      const tiff = i + 10;
      if (tiff + 8 < b.length) {
        const little = b[tiff] === 0x49;
        const ifd = tiff + view.getUint32(tiff + 4, little);
        if (ifd + 2 < b.length) {
          const entries = view.getUint16(ifd, little);
          for (let e = 0; e < entries; e++) {
            const at = ifd + 2 + e * 12;
            if (at + 10 > b.length) break;
            if (view.getUint16(at, little) === 0x0112) {
              orientation = view.getUint16(at + 8, little);
              break;
            }
          }
        }
      }
    }

    // start of frame (any kind except DHT / JPG / DAC, which share the range)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = view.getUint16(i + 5);
      const width = view.getUint16(i + 7);
      // orientations 5 to 8 are rotated a quarter turn
      return orientation >= 5 && orientation <= 8
        ? { width: height, height: width }
        : { width, height };
    }

    i += 2 + len;
  }
  return null;
}

function pngSize(b: Uint8Array): ImageSize | null {
  if (b.length < 24 || b[0] !== 0x89 || b[1] !== 0x50 || b[2] !== 0x4e || b[3] !== 0x47) return null;
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function webpSize(b: Uint8Array): ImageSize | null {
  const ascii = (at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n));
  if (b.length < 30 || ascii(0, 4) !== "RIFF" || ascii(8, 4) !== "WEBP") return null;
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const chunk = ascii(12, 4);
  if (chunk === "VP8 ") {
    return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
  }
  if (chunk === "VP8L") {
    const bits = view.getUint32(21, true);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    const w = b[24] | (b[25] << 8) | (b[26] << 16);
    const h = b[27] | (b[28] << 8) | (b[29] << 16);
    return { width: w + 1, height: h + 1 };
  }
  return null;
}

const parse = (b: Uint8Array) => jpegSize(b) ?? pngSize(b) ?? webpSize(b);

async function readImageSize(url: string): Promise<ImageSize | null> {
  const head = await fetch(url, { headers: { Range: `bytes=0-${HEAD_BYTES - 1}` } });
  if (!head.ok) throw new Error(`HTTP ${head.status} for ${url}`);
  const bytes = new Uint8Array(await head.arrayBuffer());
  const size = parse(bytes);
  if (size || head.status !== 206) return size;

  // header ran past the first chunk (a huge EXIF block): read the whole file
  const full = await fetch(url);
  if (!full.ok) throw new Error(`HTTP ${full.status} for ${url}`);
  return parse(new Uint8Array(await full.arrayBuffer()));
}

// a photo's dimensions never change, so they're kept for a week. Network failures throw, so
// they aren't cached and the next render tries again.
const cachedImageSize = unstable_cache(readImageSize, ["image-size"], {
  revalidate: 60 * 60 * 24 * 7,
});

export async function getImageSize(url: string): Promise<ImageSize | null> {
  try {
    return await cachedImageSize(url);
  } catch {
    return null;
  }
}
