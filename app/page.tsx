import type { Metadata } from "next";
import HomeHero from "./components/HomeHero";
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
          getR2Url("photos/wave2earth2026/5.jpg"),
          getR2Url("homepage/myfriends.jpg"),
          getR2Url("videos/makefriends.jpeg"),
          getR2Url("videos/motacycles.jpg"),
          getR2Url("homepage/bluecntower.jpg"),
          getR2Url("homepage/aboutme.jpg"),
          getR2Url("homepage/hiking.jpg"),
          getR2Url("photos/wave2earth2026/2.jpg"),
          getR2Url("homepage/morefriends.jpg"),
          getR2Url("homepage/HOSA.jpg"),
          getR2Url("homepage/yearning.jpg"),
          getR2Url("homepage/climbing.jpg"),
          getR2Url("homepage/thanksjoy.jpg"),
          getR2Url("homepage/kananaskis.jpg"),
          getR2Url("homepage/aquarium.jpg"),
        ]}
        portrait={getR2Url("homepage/photoofme.jpg")}
        flipimage={getR2Url("homepage/cardbacking.jpg")}
      />

      <SideQuests />
    </div>
  );
}
