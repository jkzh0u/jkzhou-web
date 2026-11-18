import { renderCard } from "@/lib/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "C62 manual · jackson zhou";

// Only the C62 has a manual (see page.tsx), so the card doesn't need the slug
export function generateStaticParams() {
  return [{ slug: "c62" }];
}

export default function Image() {
  return renderCard({
    section: "projects",
    title: "C62 manual",
    description:
      "every menu and setting in my C62 TETRA firmware: what each one does, what it starts at, and the screen it's on.",
    image: "/projects/c62-manual/menu-11-about.png",
    fit: "contain",
  });
}
