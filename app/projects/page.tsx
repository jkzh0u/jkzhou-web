import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo";
import { projects, type Project } from "@/data/projects";
import ProjectVideo from "../components/ProjectVideo";
import HomelabDiagram from "../components/HomelabDiagram";
import GithubIcon from "../components/GithubIcon";
import ProjectFilter from "../components/ProjectFilter";

export const metadata: Metadata = pageMetadata({
  title: "projects",
  description:
    "my projects.",
  path: "/projects",
});

// Same shimmer as the album skeleton
const css = `
  .pj-skel {
    position: relative;
    overflow: hidden;
    background: color-mix(in srgb, currentColor 6%, transparent);
  }

  .pj-skel::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      100deg,
      transparent 20%,
      color-mix(in srgb, currentColor 8%, transparent) 50%,
      transparent 80%
    );
    background-size: 220% 100%;
    animation: pj-shimmer 1.4s linear infinite;
  }

  @keyframes pj-shimmer {
    from { background-position: 120% 0; }
    to { background-position: -120% 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .pj-skel::after { animation: none; }
  }
`;

function ProjectCard({ project }: { project: Project }) {
  return (
    // The title link stretches over the whole card, so the repo icon can be its own link
    <div className="group relative">
      <div
        className={`relative aspect-[3/2] overflow-hidden ${project.comingSoon ? "pj-skel" : "bg-neutral-100"}`}
      >
        {project.diagram === "homelab" ? (
          <HomelabDiagram compact />
        ) : project.video ? (
          <ProjectVideo
            src={project.video}
            poster={project.poster}
            label={`${project.name} demo`}
          />
        ) : (
          project.poster && (
            <Image
              src={project.poster}
              alt={`${project.name} preview`}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          )
        )}
      </div>

      <div className="mt-8 flex items-baseline justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-semibold sm:text-2xl">
            {project.slug ? (
              <Link href={`/projects/${project.slug}`} className="after:absolute after:inset-0">
                {project.name}
              </Link>
            ) : project.href ? (
              <a
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                className="after:absolute after:inset-0"
              >
                {project.name}
              </a>
            ) : (
              project.name
            )}
          </h2>
          {project.repo && (
            <a
              href={project.repo}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${project.name} on github`}
              className="relative z-10 transition-opacity hover:opacity-60"
            >
              <GithubIcon />
            </a>
          )}
        </div>
        {project.date && (
          <span className="text-xl whitespace-nowrap text-neutral-500 sm:text-2xl">
            {project.date}
          </span>
        )}
      </div>

      {project.description && (
        <p className="mt-3 text-lg leading-relaxed text-neutral-500 transition-colors group-hover:text-neutral-700">
          {project.description}
        </p>
      )}
    </div>
  );
}

// The tags in use, in the order projects first use them
const tags = [...new Set(projects.flatMap((project) => project.topics ?? []))];

export default function Page() {
  return (
    <main className="min-h-screen bg-background px-4 pt-24 pb-24 text-foreground sm:px-8 sm:pt-28 lg:px-28 lg:pt-32">
      <style>{css}</style>

      <h1 className="load-reveal mx-auto mb-8 max-w-5xl text-3xl font-semibold">projects</h1>

      <Suspense>
        <ProjectFilter
          tags={tags}
          items={projects.map((project) => ({
            key: project.name,
            topics: project.topics ?? [],
            card: <ProjectCard project={project} />,
          }))}
        />
      </Suspense>
    </main>
  );
}
