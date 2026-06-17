"use client";

import type React from "react";
import FadeInSection from "./FadeInSection";
import TiltCard from "./TiltCard";

const photos_image = "/homepage/photos.jpg";
const videos_image = "/homepage/videos.jpg";
const instagram_image = "/homepage/instagram.jpg";
const contact_image = "/homepage/contact.jpg";

const polaroidImage1 = "/homepage/mywork2.jpg";
const polaroidImage2 = "/homepage/mywork1.jpg";

const items = [
  {
    title: "photos",
    href: "/photos",
    desc: "still moments, events, shows, and more.",
    image: photos_image,
  },
  {
    title: "videos",
    href: "/videos",
    desc: "my short-form projects.",
    image: videos_image,
  },
  {
    title: "instagram",
    href: "https://instagram.com/jacksonzhoux",
    desc: "my social media, starting a small vlog.",
    image: instagram_image,
  },
  {
    title: "contact",
    href: "/contact",
    desc: "reach out for inquiries, shoots, or collaborations!",
    image: contact_image,
  },
];

function WorkButton({
  title,
  href,
  desc,
  image,
}: {
  title: string;
  href: string;
  desc: string;
  image: string;
}) {
  return (
    <a
      href={href}
      className="group relative block overflow-hidden rounded-3xl border border-foreground/10 p-6 transition-all duration-700 hover:border-foreground/20"
      style={
        {
          "--card-bg":
            "color-mix(in srgb, var(--foreground) 3%, var(--background))",
          "--card-bg-hover":
            "color-mix(in srgb, var(--foreground) 5%, var(--background))",
          background: "var(--card-bg)",
        } as React.CSSProperties
      }
      onMouseEnter={(e) => {
        if (window.innerWidth >= 640) {
          e.currentTarget.style.background = "var(--card-bg-hover)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--card-bg)";
      }}
    >
      <div className="absolute inset-y-0 right-0 w-[55%] scale-100 opacity-100 transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)] sm:scale-[1.08] sm:opacity-0 sm:group-hover:scale-100 sm:group-hover:opacity-100">
        <img src={image} alt="" className="h-full w-full object-cover" />

        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(
                90deg,
                var(--card-bg) 0%,
                color-mix(in srgb, var(--card-bg) 95%, transparent) 22%,
                color-mix(in srgb, var(--card-bg) 75%, transparent) 42%,
                color-mix(in srgb, var(--card-bg) 35%, transparent) 65%,
                transparent 100%
              )
            `,
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(
                0deg,
                color-mix(in srgb, var(--card-bg) 45%, transparent) 0%,
                transparent 55%
              )
            `,
          }}
        />
      </div>

      <div className="relative z-10 flex items-center justify-between gap-6">
        <div>
          <p className="text-4xl font-bold tracking-tight md:text-6xl">
            {title}
          </p>

          <p className="mt-3 max-w-md text-sm text-foreground/50 md:text-base">
            {desc}
          </p>
        </div>
      </div>
    </a>
  );
}

function PolaroidCard() {
  return (
    <div className="w-full pt-6">
      <div className="relative mx-auto h-[340px] w-[380px] max-w-full">
        <div className="absolute left-2 top-10">
          <TiltCard className="w-[235px] rotate-[-8deg] rounded-[3px] bg-[#f8f7f3] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.30)]">
            <div className="aspect-square overflow-hidden bg-neutral-900">
              <img
                src={polaroidImage1}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex h-[62px] items-center justify-center">
              <p className="translate-y-[1px] text-center text-[14px] font-semibold uppercase tracking-[0.22em] text-neutral-700">
                friends!
              </p>
            </div>
          </TiltCard>
        </div>

        <div className="absolute right-2 top-0 z-10">
          <TiltCard className="w-[235px] rotate-[6deg] rounded-[3px] bg-[#f8f7f3] p-3 shadow-[0_25px_70px_rgba(0,0,0,0.38)]">
            <div className="aspect-square overflow-hidden bg-neutral-900">
              <img
                src={polaroidImage2}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex h-[62px] items-center justify-center">
              <p className="translate-y-[1px] text-center text-[14px] font-semibold uppercase tracking-[0.22em] text-neutral-700">
                stills
              </p>
            </div>
          </TiltCard>
        </div>
      </div>
    </div>
  );
}

export default function MyWork() {
  return (
    <section className="mx-auto my-24 w-full max-w-6xl px-4">
      <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <FadeInSection delay={100}>
          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.35em] text-foreground/40">
              portfolio
            </p>

            <h2 className="text-6xl font-bold tracking-tight md:text-8xl">
              my work
            </h2>

            <p className="mt-6 max-w-sm text-base leading-relaxed text-foreground/50">
              a mix of photography, videos, and the stuff I make along the way.
            </p>

            <div className="hidden lg:block">
              <PolaroidCard />
            </div>
          </div>
        </FadeInSection>

        <div className="space-y-4">
          {items.map((item, index) => (
            <FadeInSection key={item.title} delay={250 + index * 120}>
              <WorkButton {...item} />
            </FadeInSection>
          ))}

          <FadeInSection delay={800}>
            <div className="lg:hidden">
              <PolaroidCard />
            </div>
          </FadeInSection>
        </div>
      </div>
    </section>
  );
}