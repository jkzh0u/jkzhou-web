import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { projects, type RadioSite } from "@/data/projects";
import { pageMetadata } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import SdrViewer from "../../components/SdrViewer";
import C62Viewer from "../../components/C62Viewer";
import ProjectVideo from "../../components/ProjectVideo";
import HomelabDiagram from "../../components/HomelabDiagram";
import OpentoWidget from "../../components/OpentoWidget";
import AbcantoWidget from "../../components/AbcantoWidget";
import TagList from "../../components/TagList";
import GithubIcon from "../../components/GithubIcon";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.flatMap((project) => (project.slug ? [{ slug: project.slug }] : []));
}

const findProject = (slug: string) => projects.find((project) => project.slug === slug);

const LINK_CLASS =
  "text-neutral-800 underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-neutral-800";

// Write-up text can hold links as [text](url): a path on this site, or a full address that opens in a new tab
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)\s]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
        if (!match) return part;
        const [, label, href] = match;
        return href.startsWith("/") ? (
          <Link key={i} href={href} className={LINK_CLASS}>
            {label}
          </Link>
        ) : (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            {label}
          </a>
        );
      })}
    </>
  );
}

function SitesTable({ sites }: { sites: RadioSite[] }) {
  return (
    <div className="mt-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs tracking-wide text-neutral-400 uppercase">
              <th scope="col" className="py-2 pr-4 font-medium">site</th>
              <th scope="col" className="py-2 font-medium">frequencies (MHz)</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => (
              <tr key={site.name} className="border-b border-neutral-200 align-top">
                <td className="py-3 pr-4 text-neutral-800">{site.name}</td>
                <td className="py-3">
                  <ul className="flex flex-wrap gap-1.5">
                    {site.frequencies.map((frequency) => (
                      <li
                        key={frequency}
                        className="rounded-md border border-neutral-300 px-2 py-0.5 font-mono text-xs text-neutral-700"
                      >
                        {frequency}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = findProject(slug);

  if (!project) return { title: "project not found" };

  return pageMetadata({
    title: project.name,
    description: project.description ?? project.name,
    path: `/projects/${slug}`,
  });
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = findProject(slug);

  if (!project) notFound();

  return (
    <main className="min-h-screen bg-background px-4 pt-24 pb-24 text-foreground sm:px-8 sm:pt-28 lg:px-20 lg:pt-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-2 lg:gap-x-10">
          {/* The viewer pins itself inside this column while the write up scrolls past */}
          <div className="media-reveal order-2 lg:order-none" style={{ animationDelay: "0.2s" }}>
            {slug === "sdr" ? (
              <SdrViewer screen="/projects/sdr-screen.mp4" />
            ) : slug === "c62" ? (
              <C62Viewer screen="/projects/c62-screen.png" alarm="/projects/c62-alarm.png" />
            ) : (
              // On desktop this box is one screen tall and pinned, so the media sits in the middle of
              // the screen while the write up scrolls. -mt-32 cancels the page's top padding (lg:pt-32)
              // so "the middle" is the middle of the screen, not 128px below it.
              <div className="lg:sticky lg:top-0 lg:-mt-32 lg:flex lg:h-svh lg:flex-col lg:justify-center-safe lg:pt-14">
                {project.diagram === "homelab" ? (
                  <HomelabDiagram />
                ) : project.video ? (
                  <div className="space-y-6">
                    <div className="relative aspect-[3/2] overflow-hidden bg-neutral-100">
                      <ProjectVideo
                        src={project.video}
                        poster={project.poster}
                        label={`${project.name} demo`}
                      />
                    </div>
                    {project.widget === "opento" && (
                      <div className="relative aspect-[3/2] overflow-hidden bg-neutral-100 lg:aspect-[2/1]">
                        <OpentoWidget />
                      </div>
                    )}
                    {project.widget === "abcanto" && (
                      // Taller when stacked so a few results fit; on desktop it shares the pinned
                      // screen-tall column with the video, so it matches the video's shape
                      <div className="relative h-[34rem] overflow-hidden border border-neutral-200 bg-[#1f1a14] lg:aspect-[3/2] lg:h-auto">
                        <AbcantoWidget />
                      </div>
                    )}
                  </div>
                ) : (
                  project.poster && (
                    <div className="relative aspect-[3/2] overflow-hidden bg-neutral-100">
                      <Image
                        src={project.poster}
                        alt={`${project.name} preview`}
                        fill
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* One pinned column on desktop. When stacked its children join the page grid, so the
              title stays above the model and the write up below it. */}
          <div className="contents lg:sticky lg:top-24 lg:block lg:self-start">
            <div className="order-1">
              {project.topics && <TagList tags={project.topics} href={(tag) => `/projects?tag=${tag}`} className="load-reveal mb-4" />}
              <h1 className="load-reveal text-4xl font-semibold sm:text-5xl">{project.name}</h1>

              {project.description && (
                <p
                  className="load-reveal mt-3 text-lg leading-relaxed text-neutral-500"
                  style={{ animationDelay: "0.12s" }}
                >
                  {project.description}
                </p>
              )}

              {(project.href || project.repo) && (
                <div className="load-reveal mt-5 flex flex-wrap gap-2" style={{ animationDelay: "0.2s" }}>
                  {project.href && (
                    <a
                      href={project.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center gap-1.5 border border-neutral-300 px-4 text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-950"
                    >
                      visit {new URL(project.href).host}
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </a>
                  )}
                  {slug === "c62" && (
                    <Link
                      href="/projects/c62/manual"
                      className="inline-flex h-10 items-center gap-1.5 border border-neutral-300 px-4 text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-950"
                    >
                      read the manual
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  )}
                  {project.repo && (
                    <a
                      href={project.repo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex h-10 items-center gap-2 bg-neutral-900 pr-4 pl-3.5 text-white transition-colors hover:bg-neutral-700"
                    >
                      <GithubIcon size={18} />
                      view source
                      <ArrowUpRight
                        className="size-4 text-white/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
                        aria-hidden="true"
                      />
                    </a>
                  )}
                </div>
              )}
            </div>

            {project.writeup && (
              <div
                className="load-reveal order-3 mt-4 space-y-10 lg:mt-10"
                style={{ animationDelay: "0.28s" }}
              >
                {project.writeup.map((section) => (
                  <section key={section.heading}>
                    <h2 className="text-xl font-semibold sm:text-2xl">{section.heading}</h2>
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="mt-3 text-lg leading-relaxed text-neutral-600">
                        <RichText text={paragraph} />
                      </p>
                    ))}
                    {section.code && (
                      <pre className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4 font-mono text-sm leading-relaxed text-neutral-800">
                        <code>{section.code}</code>
                      </pre>
                    )}
                    {section.sites && <SitesTable sites={section.sites} />}
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
