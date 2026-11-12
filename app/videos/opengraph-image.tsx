import { renderCard } from "@/lib/og";
import { getR2Url } from "@/lib/r2";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "videos · jackson zhou";

export default function Image() {
  return renderCard({
    section: "videos",
    title: "videos",
    description: "vlogs and short films created by me.",
    image: getR2Url("homepage/photoofme.jpg"),
  });
}
