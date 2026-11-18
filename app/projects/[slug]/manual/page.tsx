import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import {
  manual,
  badgeLabels,
  badgeMeanings,
  type ManualBadge,
  type ManualPage,
} from "@/data/c62Manual";

// Only the C62 has a manual
const MANUAL_SLUG = "c62";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ slug: MANUAL_SLUG }];
}

const TITLE = "C62 manual";
const DESCRIPTION =
  "every menu and setting in my C62 TETRA firmware: what each one does, what it starts at, and the screen it's on.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== MANUAL_SLUG) return { title: "page not found" };
  return pageMetadata({ title: TITLE, description: DESCRIPTION, path: `/projects/${slug}/manual` });
}

// In manual text, {name} is a key on the radio
function KeyText({ text }: { text: string }) {
  const parts = text.split(/(\{[^}]+\})/g);
  return (
    <>
      {parts.map((part, i) => {
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
            className={`mx-0.5 inline-block min-w-[1.6em] rounded-md border border-b-2 bg-white px-1.5 text-center font-mono text-[0.8em] leading-normal ${tone}`}
          >
            {name === "up" ? "▲" : name === "down" ? "▼" : name}
          </kbd>
        );
      })}
    </>
  );
}

function Badge({ badge }: { badge: ManualBadge }) {
  const tone =
    badge === "c62"
      ? "border-sky-300 text-sky-700"
      : badge === "saved"
        ? "border-emerald-300 text-emerald-700"
        : badge === "channel"
          ? "border-amber-300 text-amber-700"
          : "border-neutral-300 text-neutral-500";
  return (
    <span className={`rounded-md border px-2 py-0.5 font-mono text-xs whitespace-nowrap ${tone}`}>
      {badgeLabels[badge]}
    </span>
  );
}

function ManualTableView({ page }: { page: ManualPage }) {
  if (!page.table) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs tracking-wide text-neutral-400 uppercase">
            {page.table.columns.map((column) => (
              <th key={column} scope="col" className="py-2 pr-4 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {page.table.rows.map((row) => (
            <tr key={row.join("|")} className="border-b border-neutral-200 align-top">
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={
                    i === 0
                      ? "py-3 pr-4 whitespace-nowrap text-neutral-800"
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
          <figcaption className="mt-2 text-sm text-neutral-400">{screen.caption}</figcaption>
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
    <article id={page.id} className="scroll-mt-28 border-t border-neutral-200 pt-6">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-1 text-lg font-semibold sm:text-xl">{page.title}</h3>
        {page.badges?.map((badge) => <Badge key={badge} badge={badge} />)}
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
          {DESCRIPTION}{" "}
          it&apos;s written from the firmware&apos;s code and none of it has been tried on a radio yet,
          so the key names especially might change.
        </p>
        <ul className="load-reveal mt-5 flex flex-col gap-2 text-sm text-neutral-500" style={{ animationDelay: "0.2s" }}>
          {(Object.keys(badgeLabels) as ManualBadge[]).map((badge) => (
            <li key={badge} className="flex flex-wrap items-center gap-2">
              <Badge badge={badge} />
              {badgeMeanings[badge]}
            </li>
          ))}
        </ul>

        <div
          className="load-reveal mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-16"
          style={{ animationDelay: "0.28s" }}
        >
          <nav aria-label="contents" className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs tracking-wide text-neutral-400 uppercase">contents</p>
            <ol className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 lg:grid-cols-1">
              {manual.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-neutral-800 transition-colors hover:text-neutral-500">
                    {section.heading}
                  </a>
                  <ol className="mt-1 mb-2 hidden space-y-0.5 border-l border-neutral-200 pl-3 text-sm lg:block">
                    {section.pages.map((page) => (
                      <li key={page.id}>
                        <a href={`#${page.id}`} className="text-neutral-500 transition-colors hover:text-neutral-900">
                          {page.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </nav>

          <div className="min-w-0 space-y-16">
            {manual.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-28 space-y-8">
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold sm:text-2xl">{section.heading}</h2>
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
      </div>
    </main>
  );
}
