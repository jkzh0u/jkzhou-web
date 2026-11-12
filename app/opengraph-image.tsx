import { renderCard } from "@/lib/og";
import { getR2Url } from "@/lib/r2";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "jackson zhou";

export default function Image() {
  return renderCard({
    title: "jackson zhou.",
    section: "home",
    description: "photographer, filmmaker and creator based in toronto.",
    image: getR2Url("homepage/photoofme.jpg"),
  });
}
