import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { projects, type RadioSite } from "@/data/projects";
import { pageMetadata } from "@/lib/seo";
import SdrViewer from "../../components/SdrViewer";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.flatMap((project) => (project.slug ? [{ slug: project.slug }] : []));
}

const findProject = (slug: string) => projects.find((project) => project.slug === slug);

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
            {slug === "sdr" && <SdrViewer screen="/projects/sdr-screen.mp4" />}
          </div>

          {/* One pinned column on desktop. When stacked its children join the page grid, so the
              title stays above the model and the write up below it. */}
          <div className="contents lg:sticky lg:top-24 lg:block lg:self-start">
            <div className="order-1">
              <h1 className="load-reveal text-3xl font-semibold">{project.name}</h1>

              {project.description && (
                <p
                  className="load-reveal mt-3 text-lg leading-relaxed text-neutral-500"
                  style={{ animationDelay: "0.12s" }}
                >
                  {project.description}
                </p>
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
                        {paragraph}
                      </p>
                    ))}
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
