import type { Metadata } from "next";
import HomeHero from "./components/HomeHero";
import AboutMe from "./components/AboutMe";
import Interests from "./components/Interests";
import SideQuests from "./components/SideQuests";
import { getR2Url } from "@/lib/r2";
import { pageMetadata } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const description =
  "jackson zhou.";

export const metadata: Metadata = pageMetadata({
  title: "jackson zhou.",
  absoluteTitle: true,
  description,
  path: "/",
});

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { "@id": `${SITE_URL}/#person` },
    },
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: "Jackson Zhou",
      alternateName: "周子冸",
      url: SITE_URL,
      image: getR2Url("homepage/photoofme.jpg"),
      jobTitle: "Photographer and filmmaker",
      description,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Toronto",
        addressRegion: "ON",
        addressCountry: "CA",
      },
      sameAs: [
        "https://www.instagram.com/jkzhouu/",
        "https://www.linkedin.com/in/jackson-zhou-9a5703297/",
      ],
    },
  ],
};

export default function Home() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <h1 className="sr-only">jackson zhou, photographer and filmmaker in toronto</h1>
      <HomeHero
        images={[
          { src: getR2Url("photos/wave2earth2026/5.jpg"), back: "wave to earth 2026" },
          { src: getR2Url("homepage/myfriends.jpg"), back: "my friends!" },
          { src: getR2Url("videos/makefriends.jpeg"), back: "content creator friends" },
          { src: getR2Url("videos/motacycles.jpg"), back: "calgary stampede 2026" },
          { src: getR2Url("homepage/bluecntower.jpg"), back: "toronto oooo" },
          { src: getR2Url("homepage/aboutme.jpg"), back: "i <3 music garden" },
          { src: getR2Url("homepage/hiking.jpg"), back: "hiking in kananaskis (keep it niche)" },
          { src: getR2Url("photos/wave2earth2026/2.jpg"), back: "woahh daniel kim from w2e?" },
          { src: getR2Url("homepage/morefriends.jpg"), back: "view from biidaasige park" },
          { src: getR2Url("homepage/HOSA.jpg"), back: "HOSA 2026 with trixie!" },
          { src: getR2Url("homepage/yearning.jpg"), back: "yearning at rc harris" },
          { src: getR2Url("homepage/climbing.jpg"), back: "rock cimbing larp larp" },
          { src: getR2Url("homepage/thanksjoy.jpg"), back: "camp o 2025, thanks joy" },
          { src: getR2Url("homepage/kananaskis.jpg"), back: "hiking in kananaskis again" },
          { src: getR2Url("homepage/aquarium.jpg"), back: "ripleys!" },
        ]}
        flipimage={getR2Url("homepage/cardbacking.png")}
      />

      <AboutMe
        portrait={getR2Url("homepage/photoofme.jpg")}
      />

      <SideQuests />

      <Interests
        interests={[
          // placeholder descriptions: replace with your own
          {
            label: "content creation",
            src: getR2Url("homepage/filmmaker.jpg"),
            description:
              "I love creating cinematic photos, and espcially photos. I rarely leave the house a camera nowadays.",
          },
          {
            label: "climbing",
            src: getR2Url("homepage/deadclimbing.jpg"),
            description:
              "climbing is my favourite way to switch my brain off. its kinda like problem solving, but with my whole body.",
          },
          {
            label: "hiking",
            src: getR2Url("homepage/hikingdad.jpg"),
            description:
              "sometimes I wish I lived in the Canadian rockies or Washington so that I can hike like every day",
          },
          // placeholders: swap in real interests and photos
          {
            label: "swimming",
            src: getR2Url("homepage/pool.jpg"),
            description: "im not that good, but my 50 free time is 29s!.",
          },
          {
            label: "daniel caesar",
            src: getR2Url("homepage/dc.jpg"),
            description: "fav song is sign of the times, or ochos rios. photo from son of spergy tour in toronto!",
          },
          {
            label: "wave to earth",
            src: getR2Url("photos/wave2earth2026/5.jpg"),
            description: "lowkey milking these photos, but fav song is sing it all again.",
          },
        ]}
      />
    </div>
  );
}
