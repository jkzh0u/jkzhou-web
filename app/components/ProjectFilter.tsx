"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

type Item = { key: string; topics: readonly string[]; card: ReactNode };

/** The tag row and the grid under it. The chosen tag lives in the address as ?tag=, so a filtered
 *  list can be linked to, and a tag on a project's page opens the list already filtered. */
export default function ProjectFilter({ tags, items }: { tags: readonly string[]; items: Item[] }) {
  const fromAddress = useSearchParams().get("tag");
  const [tag, setTag] = useState<string | null>(fromAddress && tags.includes(fromAddress) ? fromAddress : null);

  const choose = (next: string | null) => {
    setTag(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("tag", next);
    else url.searchParams.delete("tag");
    window.history.replaceState(null, "", url);
  };

  const shown = tag ? items.filter((item) => item.topics.includes(tag)) : items;

  return (
    <>
      <ul className="load-reveal mx-auto mb-10 flex max-w-5xl flex-wrap gap-2" aria-label="filter by tag">
        {[null, ...tags].map((option) => {
          const on = option === tag;
          return (
            <li key={option ?? "all"}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => choose(option)}
                className={`cursor-pointer border px-3 py-0.5 text-sm transition-colors ${
                  on
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 text-neutral-500 hover:border-neutral-900 hover:text-neutral-950"
                }`}
              >
                {option ?? "all"}
              </button>
            </li>
          );
        })}
      </ul>

      <ul className="mx-auto grid max-w-5xl grid-cols-1 gap-x-16 gap-y-16 md:grid-cols-2 lg:gap-x-24 lg:gap-y-20">
        {shown.map((item, i) => (
          <li
            key={`${tag}-${item.key}`}
            className="media-reveal"
            style={{ animationDelay: `${0.12 + i * 0.07}s` }}
          >
            {item.card}
          </li>
        ))}
      </ul>
    </>
  );
}
