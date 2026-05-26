import Image from "next/image";
import type { Metadata } from "next";
import ScrollBanner from './components/ScrollBanner'
import FadeInSection from "./components/FadeInSection";
import DesktopSticky from "./components/DesktopSticky";
import HeroText from "./components/HeroText";
import './globals.css'
import Scroll3D from './components/Scroll3D'

export const metadata: Metadata = {
  title: "jackson zhou.",
  description: "Homepage",
};

export default function Home() {
  return (
    <div className="">


{/* desktop hero only */}
<div className="hidden xl:block">
  <DesktopSticky>
    <div className="mt-3 xl:mt-0 flex flex-wrap content-center gap-5 xl:gap-10 mx-auto max-w-6xl items-center justify-center min-h-[calc(100vh-56px)]">

      {/* Left: gif */}
      <div
        style={{
          opacity: 0,
          transform: "translateY(20px) scale(1.1)",
          animation:
            "homefadein 2s cubic-bezier(0.22,1,0.36,1) 500ms forwards",
        }}
        className="flex-auto w-full xl:w-190"
      >
        <img
          className="w-full object-cover rounded-xl aspect-3/2"
          src="/web.gif"
          alt="me in a video!"
        />
      </div>

      {/* Right: text */}
      <div className="flex-1 min-w-85 self-start">
        <HeroText />
      </div>

    </div>
  </DesktopSticky>
</div>

{/* medium/mobile hero */}
<div className="block xl:hidden">
  <div className="mt-3 flex flex-col items-start justify-start gap-5 mx-auto max-w-6xl min-h-0 py-0">

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

    <div className="w-full self-start">
      <HeroText />
    </div>

  </div>
</div>


      {/* banner */}
      <div className="-mx-4 sm:-mx-8 lg:-mx-28 mt-8 lg:mt-0">
        <ScrollBanner />
      </div>

      {/* my work text */}
      <FadeInSection delay={100}>
        <div className="my-8 mx-auto max-w-6xl">
          <p className="text-5xl font-bold">my work:</p>
        </div>
      </FadeInSection>

      {/* bottom selectors */}
      <div className="mx-auto max-w-6xl grid lg:grid-cols-3 grid-cols-1 gap-8">

        {/* photos */}
        <FadeInSection delay={300}>
          <a href="/photos">
            <div className="w-full h-32 lg:aspect-4/5 lg:h-auto rounded-xl overflow-hidden transition-all duration-500 ease-out hover:scale-105 hover:shadow-2xl hover:brightness-110">
              <div className="group w-full h-full relative">
                <img
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  src="https://images.unsplash.com/photo-1434394354979-a235cd36269d?..."
                />
                <div className="absolute inset-0 bg-black/50 transition-opacity duration-500 group-hover:opacity-0" />
                <p className="absolute inset-0 flex items-center justify-center text-white font-bold text-4xl transition-opacity duration-500 group-hover:opacity-0">
                  photos
                </p>
              </div>
            </div>
          </a>
        </FadeInSection>

        {/* videos */}
        <FadeInSection delay={600}>
          <a href="/videos">
            <div className="w-full h-32 lg:aspect-4/5 lg:h-auto rounded-xl overflow-hidden transition-all duration-400 ease-out transform hover:scale-104 hover:shadow-2xl hover:brightness-110">
              <div className="group w-full h-full relative">
                <img
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  src="https://images.unsplash.com/photo-1434394354979-a235cd36269d?..."
                />
                <div className="absolute inset-0 bg-black/50 transition-opacity duration-500 group-hover:opacity-0" />
                <p className="absolute inset-0 flex items-center justify-center text-white font-bold text-4xl transition-opacity duration-500 group-hover:opacity-0">
                  videos
                </p>
              </div>
            </div>
          </a>
        </FadeInSection>

        {/* instagram */}
        <FadeInSection delay={900}>
          <a href="/photos">
            <div className="w-full h-32 lg:aspect-4/5 lg:h-auto rounded-xl overflow-hidden transition-all duration-400 ease-out transform hover:scale-104 hover:shadow-2xl hover:brightness-110">
              <div className="group w-full h-full relative">
                <img
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  src="https://images.unsplash.com/photo-1434394354979-a235cd36269d?..."
                />
                <div className="absolute inset-0 bg-black/50 transition-opacity duration-500 group-hover:opacity-0" />
                <p className="absolute inset-0 flex items-center justify-center text-white font-bold text-4xl transition-opacity duration-500 group-hover:opacity-0">
                  instagram
                </p>
              </div>
            </div>
          </a>
        </FadeInSection>

      </div>

      {/* contact */}
      <FadeInSection delay={400}>
        <div className="mx-auto max-w-6xl w-full mt-8">
          <a href="/contact">
            <div className="w-full h-14 rounded-xl overflow-hidden transition-all duration-500 ease-out hover:scale-105 hover:shadow-2xl hover:brightness-110">
              <div className="group w-full h-full relative">
                <img
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  src="https://images.unsplash.com/photo-1434394354979-a235cd36269d?..."
                />
                <div className="absolute inset-0 bg-black/50 transition-opacity duration-500 group-hover:opacity-0" />
                <p className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl transition-opacity duration-500 group-hover:opacity-80">
                  contact
                </p>
              </div>
            </div>
          </a>
        </div>
      </FadeInSection>

      {/* about me */}
      <div className="mx-auto max-w-6xl w-full mt-8">
        <p className="pb-3 text-5xl font-bold">about me!</p>
        <p className="text-neutral-600 dark:text-neutral-300">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin at fringilla massa. Aenean molestie non enim aliquam tincidunt. Praesent porttitor elit lorem, in convallis massa aliquet vitae. Mauris cursus posuere lectus, eu facilisis enim cursus sit amet. Donec a egestas sapien, id laoreet magna. Vivamus iaculis, sem ac varius tempor, dolor ex feugiat mauris, sodales consectetur lorem leo vel dui.</p>
      </div>

    </div>
  )
}