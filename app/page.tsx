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
      <div className="hidden xl:block">
        <DesktopSticky>
          <div className="mt-3 lg:mt-0 flex flex-wrap content-start lg:content-center gap-5 lg:gap-10 mx-auto max-w-6xl items-start justify-center lg:min-h-[calc(100vh-56px)]">
            {/* Left: gif */}
            <div
              style={{
                opacity: 0,
                transform: "translateY(20px) scale(1.1)",
                animation:
                  "homefadein 2s cubic-bezier(0.22,1,0.36,1) 500ms forwards",
              }}
              className="flex-auto w-full lg:w-190"
            >
              <img
                className="w-full object-cover rounded-xl aspect-3/2"
                src="/web.gif"
                alt="me in a video!"
              />
            </div>

            {/* Right: text */}
            <div className="flex-1 min-w-85 self-start lg:self-center">
              <HeroText />
            </div>
          </div>
        </DesktopSticky>
      </div>

      {/* medium/mobile hero */}
      <div className="block xl:hidden">
        <div className="mt-3 flex flex-col gap-5 mx-auto max-w-6xl">
          <div
            style={{
              opacity: 0,
              transform: "translateY(20px) scale(1.1)",
              animation:
                "homefadein 2s cubic-bezier(0.22,1,0.36,1) 500ms forwards",
            }}
            className="w-full"
          >
            <img
              className="w-full object-cover rounded-xl aspect-3/2"
              src="/web.gif"
              alt="me in a video!"
            />
          </div>

          <HeroText />
        </div>
      </div>

      <AboutMe />
      <MyWork />

    </div>
  );
}
