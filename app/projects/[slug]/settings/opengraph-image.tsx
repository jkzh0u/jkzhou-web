import { renderCard } from "@/lib/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "try the C62 menus · jackson zhou";

// Only the C62 has a menu to try (see page.tsx)
export function generateStaticParams() {
  return [{ slug: "c62" }];
}

export default function Image() {
  return renderCard({
    section: "projects",
    title: "try the C62 menus",
    description:
      "click through every menu and setting of my C62 firmware like on the radio, with what each one does as you go.",
    image: "/projects/c62-manual/menu-03-settings.png",
    fit: "contain",
  });
}
