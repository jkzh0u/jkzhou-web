import { renderCard } from "@/lib/og";
import { getR2Url } from "@/lib/r2";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "photos · jackson zhou";

export default function Image() {
  return renderCard({
    section: "photos",
    title: "photos",
    description: "photo albums by jackson zhou: concerts, school events, robotics and friends around toronto.",
    image: getR2Url("homepage/bluecntower.jpg"),
  });
}
