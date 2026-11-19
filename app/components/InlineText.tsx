import type { ReactNode } from "react";
import Link from "next/link";

const LINK_CLASS =
  "text-neutral-800 underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-neutral-800";

// `code` and [label](url) in the text
export default function InlineText({ text }: { text: string }): ReactNode {
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
