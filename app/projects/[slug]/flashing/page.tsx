import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { flashingSections, flashingIntro, flashingNote } from "@/data/c62Flashing";
import FlashingGuide from "../../../components/FlashingGuide";

// Only the C62 has flashing instructions
const FLASHING_SLUG = "c62";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ slug: FLASHING_SLUG }];
}

const TITLE = "flashing the C62";
const DESCRIPTION =
  "step by step, for macOS, Linux and Windows: install the flashing tool, back up the radio, flash my TETRA firmware and check that it runs.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== FLASHING_SLUG) return { title: "page not found" };
  return pageMetadata({ title: TITLE, description: DESCRIPTION, path: `/projects/${slug}/flashing` });
}

export default async function FlashingRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== FLASHING_SLUG) notFound();

  return (
    <main className="min-h-screen bg-background px-4 pt-24 pb-24 text-foreground sm:px-8 sm:pt-28 lg:px-20 lg:pt-32">
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/projects/${slug}`}
          className="load-reveal inline-flex items-center gap-1.5 text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          C62 TETRA project
        </Link>
        <h1 className="load-reveal mt-4 text-4xl font-semibold sm:text-5xl">{TITLE}</h1>
        <p
          className="load-reveal mt-3 max-w-3xl text-lg leading-relaxed text-neutral-500"
          style={{ animationDelay: "0.12s" }}
        >
          {flashingIntro}
        </p>
        <p
          className="load-reveal mt-5 max-w-3xl border-l-2 border-neutral-300 pl-4 leading-relaxed text-neutral-500"
          style={{ animationDelay: "0.16s" }}
        >
          {flashingNote.split(/\[([^\]]+)\]\(([^)\s]+)\)/).map((part, i, parts) =>
            i % 3 === 1 ? (
              <a
                key={i}
                href={parts[i + 1]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-800 underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-neutral-800"
              >
                {part}
              </a>
            ) : i % 3 === 2 ? null : (
              part
            ),
          )}
        </p>

        <FlashingGuide sections={flashingSections} />
      </div>
    </main>
  );
}
