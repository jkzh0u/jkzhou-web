import type { Metadata } from "next";
import FadeInSection from "./components/FadeInSection";
import DesktopSticky from "./components/DesktopSticky";
import HeroText from "./components/HeroText";
import "./globals.css";
import MyWork from "./components/MyWork";
import AboutMe from "./components/AboutMe";
import PhotographerHome from "./components/Photographerhome";
import fs from "node:fs/promises";
import path from "node:path";
import type { VideoItem } from "./components/Videomodal";
import { getR2Url } from "@/lib/r2";


async function getVideos(): Promise<VideoItem[]> {
  const file = path.join(
    process.cwd(),
    "public",
    "videos.json"
  );

  const contents = await fs.readFile(file, "utf8");
  const videos: VideoItem[] = JSON.parse(contents);
  return videos;
}


export const metadata: Metadata = {
  title: "jackson zhou.",
  description: "Homepage",
};

export default async function Home() {
  const videos = await getVideos();
  return (
    // <div className="px-4 sm:px-8 lg:px-28"> this is the stupid margin thingy
    <div>

      {/* desktop hero only */}
      <PhotographerHome
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


    </div>
  );
}
