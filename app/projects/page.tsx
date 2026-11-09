import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { projects, type Project } from "@/data/projects";
import ProjectVideo from "../components/ProjectVideo";

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

function GithubIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="19"
      height="19"
      fill="currentColor"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
    </svg>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    // The title link stretches over the whole card, so the repo icon can be its own link
    <div className="group relative">
      <div
        className={`aspect-[3/2] overflow-hidden ${project.comingSoon ? "pj-skel" : "bg-neutral-100"}`}
      >
        {project.video && (
          <ProjectVideo
            src={project.video}
            poster={project.poster}
            label={`${project.name} demo`}
          />
        )}
      </div>

      <div className="mt-8 flex items-baseline justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-semibold sm:text-2xl">
            {project.href ? (
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

export default function Page() {
  return (
    <main className="min-h-screen bg-background px-4 pt-24 pb-24 text-foreground sm:px-8 sm:pt-28 lg:px-28 lg:pt-32">
      <style>{css}</style>

      <h1 className="load-reveal mx-auto mb-8 max-w-5xl text-3xl font-semibold">projects</h1>

      <ul className="mx-auto grid max-w-5xl grid-cols-1 gap-x-16 gap-y-16 md:grid-cols-2 lg:gap-x-24 lg:gap-y-20">
        {projects.map((project, i) => (
          <li
            key={project.name}
            className="media-reveal"
            style={{ animationDelay: `${0.12 + i * 0.07}s` }}
          >
            <ProjectCard project={project} />
          </li>
        ))}
      </ul>
    </main>
  );
}
