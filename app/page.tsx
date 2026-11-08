import type { Metadata } from "next";
import HomeHero from "./components/HomeHero";
import Experiences from "./components/Experiences";
import { getR2Url } from "@/lib/r2";

export const metadata: Metadata = {
  title: { absolute: "jackson zhou. photographer and filmmaker in toronto" },
  description:
    "jackson zhou is a photographer, filmmaker and creator based in toronto, documenting life through photos and videos.",
};

export default function Home() {
  return (
    <div>
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

      <Experiences />
    </div>
  );
}
