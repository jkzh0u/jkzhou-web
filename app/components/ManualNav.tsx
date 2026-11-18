"use client";

import { useEffect, useState } from "react";

type Section = { id: string; heading: string; pages: { id: string; title: string }[] };

// How far from the top of the screen a heading counts as the one being read
const READ_LINE = 160;

/** The manual's contents. The page being read is marked, and so is its section. */
export default function ManualNav({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const ids = sections.flatMap((section) => [section.id, ...section.pages.map((page) => page.id)]);
    let frame = 0;
    const update = () => {
      frame = 0;
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= READ_LINE) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sections]);

  return (
    <nav aria-label="contents">
      <p className="font-mono text-xs tracking-wide text-neutral-400 uppercase">contents</p>
      <ol className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-1 lg:gap-y-5">
        {sections.map((section) => {
          const open = active === section.id || section.pages.some((page) => page.id === active);
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={`transition-colors hover:text-neutral-500 ${open ? "font-semibold text-neutral-950" : "text-neutral-800"}`}
              >
                {section.heading}
              </a>
              <ol className={`mt-1.5 hidden border-l border-neutral-200 text-sm ${section.pages.length ? "lg:block" : ""}`}>
                {section.pages.map((page) => (
                  <li key={page.id}>
                    <a
                      href={`#${page.id}`}
                      aria-current={active === page.id ? "location" : undefined}
                      className={`-ml-px block border-l py-0.5 pl-3 transition-colors ${
                        active === page.id
                          ? "border-neutral-900 text-neutral-950"
                          : "border-transparent text-neutral-500 hover:text-neutral-900"
                      }`}
                    >
                      {page.title}
                    </a>
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
