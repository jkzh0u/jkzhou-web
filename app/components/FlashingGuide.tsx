"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { osLabels, type FlashBlock, type FlashSection, type OS } from "@/data/c62Flashing";
import ManualNav from "./ManualNav";

const OSES = Object.keys(osLabels) as OS[];
const LINK_CLASS =
  "text-neutral-800 underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-neutral-800";

// `code` and [label](url) in the text
function Inline({ text }: { text: string }): ReactNode {
  return text.split(/(`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g).map((part, i) => {
    if (part.startsWith("`")) {
      return (
        <code key={i} className="border border-neutral-200 bg-neutral-50 px-1 font-mono text-[0.85em] text-neutral-800">
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (!link) return part;
    return link[2].startsWith("/") ? (
      <Link key={i} href={link[2]} className={LINK_CLASS}>
        {link[1]}
      </Link>
    ) : (
      <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
        {link[1]}
      </a>
    );
  });
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // no clipboard here, so the text is there to select
    }
  };
  return (
    <div className="group relative">
      <pre className="overflow-x-auto border border-neutral-200 bg-neutral-50 p-4 pr-12 font-mono text-sm leading-relaxed text-neutral-800">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "copied" : "copy to clipboard"}
        className="absolute top-2 right-2 grid size-8 cursor-pointer place-items-center border border-transparent text-neutral-400 transition-colors hover:border-neutral-300 hover:text-neutral-900"
      >
        {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

function Block({ block }: { block: FlashBlock }) {
  switch (block.type) {
    case "p":
      return (
        <p className="text-lg leading-relaxed text-neutral-600">
          <Inline text={block.text} />
        </p>
      );
    case "heading":
      return <h4 className="text-lg font-semibold">{block.text}</h4>;
    case "note":
      return (
        <p className="border-l-2 border-neutral-900 pl-4 leading-relaxed text-neutral-700">
          <Inline text={block.text} />
        </p>
      );
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List
          className={`space-y-2 pl-6 text-lg leading-relaxed text-neutral-600 marker:text-neutral-400 ${block.ordered ? "list-decimal" : "list-disc"}`}
        >
          {block.items.map((item) => (
            <li key={item} className="pl-1">
              <Inline text={item} />
            </li>
          ))}
        </List>
      );
    }
    case "code":
      return <CodeBlock code={block.code} />;
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-900 text-xs tracking-wide text-neutral-400 uppercase">
                {block.columns.map((column) => (
                  <th key={column} scope="col" className="py-2 pr-4 pl-1 font-mono font-normal">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join("|")} className="border-b border-neutral-200 align-top transition-colors hover:bg-neutral-50">
                  {row.map((cell, i) => (
                    <td
                      key={i}
                      className={
                        i === 0
                          ? "py-3 pr-4 pl-1 font-medium text-neutral-900"
                          : "py-3 pr-4 leading-relaxed text-neutral-600"
                      }
                    >
                      <Inline text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function OsPicker({ os, onPick, className = "" }: { os: OS; onPick: (os: OS) => void; className?: string }) {
  return (
    <div className={className}>
      <p className="font-mono text-xs tracking-wide text-neutral-400 uppercase">your computer</p>
      <div role="group" aria-label="your computer" className="mt-2 inline-flex border border-neutral-300">
        {OSES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={os === option}
            onClick={() => onPick(option)}
            className={`cursor-pointer px-3 py-1.5 text-sm transition-colors ${
              os === option ? "bg-neutral-900 text-white" : "text-neutral-600 hover:text-neutral-950"
            }`}
          >
            {osLabels[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

// The chosen system lives outside React, so the first render can match the server's and the
// visitor's own system (or their last choice) is picked up right after, without an effect
const listeners = new Set<() => void>();
let chosen: OS | null = null;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const currentOs = (): OS => {
  if (chosen) return chosen;
  try {
    const saved = localStorage.getItem("c62-flash-os");
    if (OSES.includes(saved as OS)) return saved as OS;
  } catch {
    // storage can be switched off
  }
  return /Win/i.test(navigator.userAgent)
    ? "windows"
    : /Mac|iPhone|iPad/i.test(navigator.userAgent)
      ? "macos"
      : "linux";
};
const chooseOs = (next: OS) => {
  chosen = next;
  try {
    localStorage.setItem("c62-flash-os", next);
  } catch {
    // storage can be switched off
  }
  listeners.forEach((listener) => listener());
};

/** The steps, and the picker that shows only the commands for your computer. */
export default function FlashingGuide({ sections }: { sections: FlashSection[] }) {
  const os = useSyncExternalStore(subscribe, currentOs, () => "macos" as OS);
  const pick = chooseOs;

  return (
    <div className="load-reveal mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-16" style={{ animationDelay: "0.24s" }}>
      <div className="lg:sticky lg:top-28 lg:self-start">
        <OsPicker os={os} onPick={pick} className="mb-8 hidden lg:block" />
        <ManualNav
          sections={sections.map(({ id, heading, steps }) => ({
            id,
            heading,
            pages: steps.map((step) => ({ id: step.id, title: step.title })),
          }))}
        />
      </div>

      <div className="min-w-0">
        <OsPicker os={os} onPick={pick} className="mb-10 lg:hidden" />
        <div className="space-y-24">
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} className="scroll-mt-28 space-y-8">
              <div className="space-y-3">
                <p className="font-mono text-sm text-neutral-400">{String(index + 1).padStart(2, "0")}</p>
                <h2 className="text-2xl font-semibold sm:text-3xl">{section.heading}</h2>
              </div>
              {section.steps.map((step) => (
                <article key={step.id} id={step.id} className="scroll-mt-28 border-t border-neutral-200 pt-8">
                  <h3 className="text-xl font-semibold sm:text-2xl">{step.title}</h3>
                  <div className="mt-5 max-w-3xl space-y-5">
                    {step.blocks
                      .filter((block) => !block.os || block.os.includes(os))
                      .map((block, i) => (
                        <Block key={i} block={block} />
                      ))}
                  </div>
                </article>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
