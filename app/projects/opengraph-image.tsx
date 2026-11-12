import { renderCard } from "@/lib/og";
import { getR2Url } from "@/lib/r2";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "projects · jackson zhou";

export default function Image() {
  return renderCard({
    section: "projects",
    title: "projects",
    description: "my projects, from programming to hardware. I love to tinker and learn new things!",
    image: getR2Url("homepage/yearning.jpg"),
  });
}
