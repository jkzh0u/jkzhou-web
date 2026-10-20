import Image from "next/image";
import type { Metadata } from "next";
import ScrollBanner from "./components/ScrollBanner";
import FadeInSection from "./components/FadeInSection";
import DesktopSticky from "./components/DesktopSticky";
import HeroText from "./components/HeroText";
import "./globals.css";
import Scroll3D from "./components/Scroll3D";
import Signature from "./components/signature";
import MyWork from "./components/MyWork";
import AboutMe from "./components/AboutMe";
import CardHero from "./components/CardHero";
import fs from "node:fs/promises";
import path from "node:path";
import type { VideoItem } from "./components/Videomodal";


async function getVideos(): Promise<VideoItem[]> {
  const file = path.join(
    process.cwd(),
    "public",
    "videos",
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
    <div className="px-4 sm:px-8 lg:px-28">
      {/* <CardHero videos={videos} /> */}
      {/* desktop hero only */}
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

      {/* banner */}
      {/* <div className="-mx-4 sm:-mx-8 lg:-mx-28">
        <ScrollBanner />
      </div> */}
<AboutMe />
<MyWork />

    </div>
  );
}
