import { renderCard } from "@/lib/og";
import { getR2Url } from "@/lib/r2";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "contact · jackson zhou";

export default function Image() {
  return renderCard({
    section: "contact",
    title: "contact",
    description: "get in touch with me for shoots, projects and collabs.",
    image: getR2Url("homepage/hiking.jpg"),
  });
}
