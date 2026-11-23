import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { channelsSections, channelsIntro } from "@/data/c62Channels";
import InstructionGuide from "../../../components/InstructionGuide";
import C62PageLinks from "../../../components/C62PageLinks";

// Only the C62 has channel list instructions
const CHANNELS_SLUG = "c62";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ slug: CHANNELS_SLUG }];
}

const TITLE = "channel lists";
const DESCRIPTION =
  "how to write a channel list for my C62 TETRA firmware, with memory channels and named talkgroups, and put it on the radio.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== CHANNELS_SLUG) return { title: "page not found" };
  return pageMetadata({ title: TITLE, description: DESCRIPTION, path: `/projects/${slug}/channels` });
}

export default async function ChannelsRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== CHANNELS_SLUG) notFound();

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
          {channelsIntro}
        </p>

        <InstructionGuide sections={channelsSections} perSystem={false} />
        <C62PageLinks current="channels" />
      </div>
    </main>
  );
}
