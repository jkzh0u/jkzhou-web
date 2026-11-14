import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getR2Url } from "@/lib/r2";

export const metadata: Metadata = {
  title: { absolute: "page not found · jackson zhou" },
};

const links = [
  { href: "/", label: "home" },
  { href: "/photos", label: "photos" },
  { href: "/videos", label: "videos" },
  { href: "/projects", label: "projects" },
];

export default function NotFound() {
  return (
    <main className="flex min-h-[100svh] items-center bg-background px-4 pt-24 pb-24 text-foreground sm:px-8 lg:px-28">
      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 items-center gap-10 md:grid-cols-[18rem_1fr] md:gap-16">
        <div className="media-reveal relative aspect-[4/5] w-full max-w-[15rem] overflow-hidden bg-neutral-100 md:max-w-none">
          <Image
            src={getR2Url("homepage/yearning.jpg")}
            alt="yearning at rc harris"
            fill
            sizes="(min-width: 768px) 288px, 240px"
            className="object-cover"
            priority
          />
        </div>

        <div>
          <p className="load-reveal text-lg font-medium tracking-wide text-neutral-400">404</p>
          <h1 className="load-reveal mt-2 text-3xl font-semibold sm:text-4xl" style={{ animationDelay: "0.08s" }}>
            yearning for a page that doesn&apos;t exist.
          </h1>
          <p
            className="load-reveal mt-4 text-lg leading-relaxed text-neutral-500"
            style={{ animationDelay: "0.16s" }}
          >
            this link doesn&apos;t go anywhere anymore, or it never did. try one of these instead:
          </p>
          <ul className="load-reveal mt-8 flex flex-wrap gap-2" style={{ animationDelay: "0.24s" }}>
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex h-10 items-center rounded-full border border-neutral-300 px-5 text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-950"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
