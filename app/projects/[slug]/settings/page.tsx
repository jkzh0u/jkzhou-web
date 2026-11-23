import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import C62PageLinks from "../../../components/C62PageLinks";
import C62SettingsSim from "../../../components/C62SettingsSim";

// Only the C62 has a menu to try
const SETTINGS_SLUG = "c62";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ slug: SETTINGS_SLUG }];
}

const TITLE = "try the C62 menus";
const DESCRIPTION =
  "click through every menu and setting of my C62 firmware like on the radio, with what each one does as you go.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== SETTINGS_SLUG) return { title: "page not found" };
  return pageMetadata({ title: TITLE, description: DESCRIPTION, path: `/projects/${slug}/settings` });
}

export default async function SettingsRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== SETTINGS_SLUG) notFound();

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
          {DESCRIPTION} nothing here talks to a real radio, and changes aren&apos;t kept. the full tables are in the{" "}
          <Link
            href={`/projects/${slug}/manual`}
            className="text-neutral-800 underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-neutral-800"
          >
            manual
          </Link>
          .
        </p>
        <div className="load-reveal mt-12" style={{ animationDelay: "0.2s" }}>
          <C62SettingsSim />
        </div>
        <C62PageLinks current="settings" />
      </div>
    </main>
  );
}
