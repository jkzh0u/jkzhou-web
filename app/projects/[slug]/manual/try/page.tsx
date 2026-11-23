import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import C62PageLinks from "../../../../components/C62PageLinks";
import C62SettingsSim from "../../../../components/C62SettingsSim";

// Only the C62 has a manual
const MANUAL_SLUG = "c62";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ slug: MANUAL_SLUG }];
}

const TITLE = "try the C62 menus";
const DESCRIPTION =
  "click through every menu and setting of my C62 firmware like on the radio, with what each one does as you go, and hear the FM sounds.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== MANUAL_SLUG) return { title: "page not found" };
  return pageMetadata({ title: TITLE, description: DESCRIPTION, path: `/projects/${slug}/manual/try` });
}

export default async function TryRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== MANUAL_SLUG) notFound();

  return (
    <main className="min-h-screen bg-background px-4 pt-24 pb-24 text-foreground sm:px-8 sm:pt-28 lg:px-20 lg:pt-32">
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/projects/${slug}/manual`}
          className="load-reveal inline-flex items-center gap-1.5 text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          C62 manual
        </Link>
        <h1 className="load-reveal mt-4 text-4xl font-semibold sm:text-5xl">{TITLE}</h1>
        <p
          className="load-reveal mt-3 max-w-3xl text-lg leading-relaxed text-neutral-500"
          style={{ animationDelay: "0.12s" }}
        >
          {DESCRIPTION}
        </p>
        <div className="load-reveal mt-12" style={{ animationDelay: "0.2s" }}>
          <C62SettingsSim />
        </div>
        <C62PageLinks current="manual" />
      </div>
    </main>
  );
}
