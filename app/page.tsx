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

export const metadata: Metadata = {
  title: "jackson zhou.",
  description: "Homepage",
};

export default function Home() {
  return (
    <div className="px-4 sm:px-8 lg:px-28">
      <Signature></Signature>
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
