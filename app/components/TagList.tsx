import type { CSSProperties } from "react";
import Link from "next/link";

const TAG_CLASS = "border border-neutral-200 px-3 py-0.5 text-sm text-neutral-500";

/** A row of small tags. With href, each one links to where that tag's projects are listed. */
export default function TagList({
  tags,
  href,
  className = "",
  style,
}: {
  tags: readonly string[];
  href?: (tag: string) => string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`} style={style}>
      {tags.map((tag) => (
        <li key={tag}>
          {href ? (
            <Link
              href={href(tag)}
              className={`${TAG_CLASS} block transition-colors hover:border-neutral-900 hover:text-neutral-950`}
            >
              {tag}
            </Link>
          ) : (
            <span className={`${TAG_CLASS} block`}>{tag}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
