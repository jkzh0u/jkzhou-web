import { renderCard } from "@/lib/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "flashing the C62 · jackson zhou";

// Only the C62 has flashing instructions (see page.tsx)
export function generateStaticParams() {
  return [{ slug: "c62" }];
}

export default function Image() {
  return renderCard({
    section: "projects",
    title: "flashing the C62",
    description:
      "step by step, for macOS, Linux and Windows: install the flashing tool, back up the radio, flash my TETRA firmware and check that it runs.",
    image: "/projects/c62-manual/menu-11-about.png",
    fit: "contain",
  });
}
