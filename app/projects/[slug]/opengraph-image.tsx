import { projects } from "@/data/projects";
import { renderCard } from "@/lib/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "project by jackson zhou";

export function generateStaticParams() {
  return projects.flatMap((p) => (p.slug ? [{ slug: p.slug }] : []));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);

  if (!project) return renderCard({ section: "projects", title: "project not found" });

  return renderCard({
    section: "projects",
    title: project.name,
    description: project.description,
    image: project.ogImage ?? project.poster,
  });
}
