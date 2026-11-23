import Link from "next/link";
import { ArrowRight } from "lucide-react";

const PAGES = [
  { id: "project", href: "/projects/c62", title: "the project", text: "what it is, how it works and how to build it" },
  { id: "manual", href: "/projects/c62/manual", title: "manual", text: "every menu and setting, and the screen it's on" },
  { id: "settings", href: "/projects/c62/settings", title: "try the menus", text: "click through the radio's menus, explained as you go" },
  { id: "flashing", href: "/projects/c62/flashing", title: "flashing", text: "back up the radio and flash the firmware" },
  { id: "channels", href: "/projects/c62/channels", title: "channel lists", text: "write your own list and put it on the radio" },
] as const;

/** Links to the other C62 pages, at the foot of each of them */
export default function C62PageLinks({ current }: { current: (typeof PAGES)[number]["id"] }) {
  return (
    <nav aria-label="more on the C62" className="mt-24 border-t border-neutral-900 pt-6">
      <p className="font-mono text-xs tracking-wide text-neutral-400 uppercase">more on the C62</p>
      <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PAGES.filter((page) => page.id !== current).map((page) => (
          <li key={page.id}>
            <Link
              href={page.href}
              className="group flex h-full items-start justify-between gap-4 border border-neutral-200 p-5 transition-colors hover:border-neutral-900"
            >
              <span>
                <span className="block text-lg font-semibold">{page.title}</span>
                <span className="mt-1 block leading-relaxed text-neutral-500">{page.text}</span>
              </span>
              <ArrowRight
                className="mt-1.5 size-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-900"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
