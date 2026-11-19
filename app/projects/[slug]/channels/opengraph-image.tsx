import { renderCard } from "@/lib/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "channel lists · jackson zhou";

// Only the C62 has channel list instructions (see page.tsx)
export function generateStaticParams() {
  return [{ slug: "c62" }];
}

export default function Image() {
  return renderCard({
    section: "projects",
    title: "channel lists",
    description:
      "how to write a channel list for my C62 TETRA firmware, with memory channels and named talkgroups, and put it on the radio.",
    image: "/projects/c62-manual/menu-11-about.png",
    fit: "contain",
  });
}
