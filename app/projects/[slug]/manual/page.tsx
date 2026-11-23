import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import ManualNav from "../../../components/ManualNav";
import C62PageLinks from "../../../components/C62PageLinks";
import C62SettingsSim from "../../../components/C62SettingsSim";
import { manual, type ManualPage } from "@/data/c62Manual";

// Only the C62 has a manual
const MANUAL_SLUG = "c62";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ slug: MANUAL_SLUG }];
}

const TITLE = "C62 manual";
const DESCRIPTION =
  "every menu and setting in my C62 TETRA firmware: try them on a simulated screen, then what each one does, what it starts at, and the screen it's on.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== MANUAL_SLUG) return { title: "page not found" };
  return pageMetadata({ title: TITLE, description: DESCRIPTION, path: `/projects/${slug}/manual` });
}

// In manual text, {name} is a key on the radio and [label](/path) is a link
function KeyText({ text }: { text: string }) {
  const parts = text.split(/(\{[^}]+\}|\[[^\]]+\]\([^)\s]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
        if (link) {
          return (
            <Link
              key={i}
              href={link[2]}
              className="text-neutral-800 underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-neutral-800"
            >
              {link[1]}
            </Link>
          );
        }
        const match = /^\{([^}]+)\}$/.exec(part);
        if (!match) return part;
        const name = match[1];
        const tone =
          name === "green"
            ? "border-emerald-600 text-emerald-700"
            : name === "red"
              ? "border-red-600 text-red-700"
              : "border-neutral-300 text-neutral-700";
        return (
          <kbd
            key={i}
            className={`mx-0.5 inline-block min-w-[1.7em] border border-b-2 bg-neutral-50 px-1.5 text-center font-mono text-[0.8em] leading-normal ${tone}`}
          >
            {name === "up" ? "▲" : name === "down" ? "▼" : name}
          </kbd>
        );
      })}
    </>
  );
}

function ManualTableView({ page }: { page: ManualPage }) {
  if (!page.table) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-900 text-xs tracking-wide text-neutral-400 uppercase">
            {page.table.columns.map((column) => (
              <th key={column} scope="col" className="py-2 pr-4 pl-1 font-mono font-normal">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {page.table.rows.map((row) => (
            <tr key={row.join("|")} className="border-b border-neutral-200 align-top transition-colors hover:bg-neutral-50">
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={
                    i === 0
                      ? "py-3 pr-4 pl-1 font-medium whitespace-nowrap text-neutral-900"
                      : "py-3 pr-4 leading-relaxed text-neutral-600"
                  }
                >
                  <KeyText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Screens({ page }: { page: ManualPage }) {
  if (!page.screens) return null;
  const many = page.screens.length > 1;
  return (
    <div className={many ? "grid grid-cols-1 gap-4 sm:grid-cols-3" : "max-w-xs"}>
      {page.screens.map((screen) => (
        <figure key={screen.src}>
          <div className="bg-neutral-950 p-2.5">
            <Image
              src={screen.src}
              alt={screen.alt}
              width={640}
              height={512}
              unoptimized
              className="h-auto w-full [image-rendering:pixelated]"
            />
          </div>
          <figcaption className="mt-2 font-mono text-xs text-neutral-400">{screen.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function PageEntry({ page }: { page: ManualPage }) {
  const sideBySide = page.screens?.length === 1 && (page.table || page.paragraphs);
  const body = (
    <div className="min-w-0 space-y-4">
      {page.paragraphs?.map((paragraph) => (
        <p key={paragraph} className="text-lg leading-relaxed text-neutral-600">
          <KeyText text={paragraph} />
        </p>
      ))}
      <ManualTableView page={page} />
      {page.note && (
        <p className="text-sm leading-relaxed text-neutral-500">
          <KeyText text={page.note} />
        </p>
      )}
    </div>
  );

  return (
    <article id={page.id} className="scroll-mt-28 border-t border-neutral-200 pt-8">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-2 text-xl font-semibold sm:text-2xl">{page.title}</h3>
      </div>
      {sideBySide ? (
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-[16rem_minmax(0,1fr)]">
          <Screens page={page} />
          {body}
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          <Screens page={page} />
          {body}
        </div>
      )}
    </article>
  );
}

export default async function ManualRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== MANUAL_SLUG) notFound();

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
          {DESCRIPTION}
        </p>
        <section
          id="try"
          aria-labelledby="try-heading"
          className="load-reveal mt-12 scroll-mt-28 space-y-8"
          style={{ animationDelay: "0.24s" }}
        >
          <div className="space-y-3">
            <p className="font-mono text-sm text-neutral-400">try it</p>
            <h2 id="try-heading" className="text-2xl font-semibold sm:text-3xl">
              the menus, on the radio&apos;s screen
            </h2>
            <p className="max-w-3xl text-lg leading-relaxed text-neutral-600">
              click through every menu and setting like on the radio, with what each one does as you go, and hear the FM sounds.
            </p>
          </div>
          <C62SettingsSim />
        </section>

        <div
          className="load-reveal mt-24 grid grid-cols-1 gap-10 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-16"
          style={{ animationDelay: "0.28s" }}
        >
          <div className="lg:sticky lg:top-28 lg:self-start">
            <ManualNav sections={manual.map(({ id, heading, pages }) => ({ id, heading, pages: pages.map((p) => ({ id: p.id, title: p.title })) }))} />
          </div>

          <div className="min-w-0 space-y-24">
            {manual.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-28 space-y-8">
                <div className="space-y-3">
                  <p className="font-mono text-sm text-neutral-400">{String(index + 1).padStart(2, "0")}</p>
                  <h2 className="text-2xl font-semibold sm:text-3xl">{section.heading}</h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="max-w-3xl text-lg leading-relaxed text-neutral-600">
                      <KeyText text={paragraph} />
                    </p>
                  ))}
                </div>
                {section.pages.map((page) => (
                  <PageEntry key={page.id} page={page} />
                ))}
              </section>
            ))}
          </div>
        </div>
        <C62PageLinks current="manual" />
      </div>
    </main>
  );
}
