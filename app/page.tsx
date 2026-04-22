import Image from "next/image";
import type { Metadata } from "next";
import ScrollBanner from './components/ScrollBanner'
import FadeInSection from "./components/FadeInSection";
import DesktopSticky from "./components/DesktopSticky";
import './globals.css'

export const metadata: Metadata = {
  title: "jackson zhou.",
  description: "Homepage",
};


export default function Home() 
// const marqueeRef = useRef<HTMLDivElement>(null)
{
  return (

//  whole page div
    <div className="">

{/* top page part */}

{/* on desktop havethe fancy thingy thangy */}
  <DesktopSticky>
  <div className="mt-3 lg:mt-0 flex flex-wrap content-start lg:content-center gap-5 lg:gap-10 mx-auto max-w-6xl items-start justify-center lg:min-h-[calc(100vh-56px)]">
    {/* Left: image/gif */}
    <div 
        style={{ animation: 'homefadein 2s cubic-bezier(0.22,1,0.36,1) 500ms forwards' }}
        className="flex-auto w-full lg:w-190 homefadein">
    <img
        className="w-full object-cover rounded-xl aspect-3/2"
        src="/web.gif"
        alt="me in a video!"
      />
    </div>

    {/* Right: text */}
    <div className="flex-1 min-w-85">
      <FadeInSection delay={800}>
      <p className="text-5xl font-bold">hello!</p>
      </FadeInSection>
      <FadeInSection delay={1000}>
      <p className="mt-5 text-neutral-600 dark:text-neutral-300">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin at fringilla massa. Aenean molestie non enim aliquam tincidunt. Praesent porttitor elit lorem, in convallis massa aliquet vitae. Mauris cursus posuere lectus, eu facilisis enim cursus sit amet. Donec a egestas sapien, id laoreet magna. Vivamus iaculis, sem ac varius tempor, dolor ex feugiat mauris, sodales consectetur lorem leo vel dui. Ut mi lorem, imperdiet quis hendrerit interdum, tincidunt sed sapien. Morbi ullamcorper ligula a quam venenatis, id vestibulum lectus lobortis. Ut mollis tortor sit amet arcu volutpat, at vestibulum tellus vulputate. Suspendisse luctus efficitur felis, sit amet scelerisque urna. Vivamus sem justo, volutpat id suscipit quis, finibus egestas neque. Nulla tempus pellentesque lectus id rhoncus. Sed varius felis eu mi eleifend, et lobortis augue laoreet.</p>
      </FadeInSection>
    </div>
  </div>
</DesktopSticky>

{/* make the desktop sticky thingy not show when its too small */}
<div className="lg:hidden">
  <div className="mt-3 lg:mt-0 flex flex-wrap content-start lg:content-center gap-5 lg:gap-10 mx-auto max-w-6xl items-start justify-center lg:min-h-[calc(100vh-56px)]">
    {/* Left: image/gif */}
    <div 
        style={{ animation: 'homefadein 2s cubic-bezier(0.22,1,0.36,1) 500ms forwards' }}
        className="flex-auto w-full lg:w-190 homefadein">
    <img
        className="w-full object-cover rounded-xl aspect-3/2"
        src="/web.gif"
        alt="me in a video!"
      />
    </div>

    {/* Right: text */}
    <div className="flex-1 min-w-85">
      <FadeInSection delay={800}>
      <p className="text-5xl font-bold">hello!</p>
      </FadeInSection>
      <FadeInSection delay={1000}>
      <p className="mt-5 text-neutral-600 dark:text-neutral-300">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin at fringilla massa. Aenean molestie non enim aliquam tincidunt. Praesent porttitor elit lorem, in convallis massa aliquet vitae. Mauris cursus posuere lectus, eu facilisis enim cursus sit amet. Donec a egestas sapien, id laoreet magna. Vivamus iaculis, sem ac varius tempor, dolor ex feugiat mauris, sodales consectetur lorem leo vel dui. Ut mi lorem, imperdiet quis hendrerit interdum, tincidunt sed sapien. Morbi ullamcorper ligula a quam venenatis, id vestibulum lectus lobortis. Ut mollis tortor sit amet arcu volutpat, at vestibulum tellus vulputate. Suspendisse luctus efficitur felis, sit amet scelerisque urna. Vivamus sem justo, volutpat id suscipit quis, finibus egestas neque. Nulla tempus pellentesque lectus id rhoncus. Sed varius felis eu mi eleifend, et lobortis augue laoreet.</p>
      </FadeInSection>
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

{/* buttom selectors */}
<div className="mx-auto max-w-6xl grid lg:grid-cols-3 grid-cols-1 gap-8">

{/* photos */}
<FadeInSection delay={200}>
<a href="/photos">
<div className="w-full h-32 lg:aspect-4/5 lg:h-auto rounded-xl overflow-hidden 
  transition-all duration-500 ease-out 
  hover:scale-105 hover:shadow-2xl hover:brightness-110">
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
<FadeInSection delay={800}>
<a href="/videos">
    <div className="w-full h-32 lg:aspect-4/5 lg:h-auto rounded-xl overflow-hidden 
    transition-all duration-400 ease-out transform 
    hover:scale-104 hover:shadow-2xl hover:brightness-110">
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
<FadeInSection delay={1400}>
<a href="/photos">
    <div className="w-full h-32 lg:aspect-4/5 lg:h-auto rounded-xl overflow-hidden 
    transition-all duration-400 ease-out transform 
    hover:scale-104 hover:shadow-2xl hover:brightness-110">
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


{/* mobile contact */}
<div className="block lg:hidden">
  <FadeInSection delay={1800}>
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
</div>

{/* desktop contact */}
<div className="hidden lg:block">
  <FadeInSection delay={100}>
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
</div>

{/* abt me */}
<div className="mx-auto max-w-6xl w-full mt-8">
    <p className="pb-3 text-5xl font-bold">about me!</p>
    <p className="text-neutral-600 dark:text-neutral-300">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin at fringilla massa. Aenean molestie non enim aliquam tincidunt. Praesent porttitor elit lorem, in convallis massa aliquet vitae. Mauris cursus posuere lectus, eu facilisis enim cursus sit amet. Donec a egestas sapien, id laoreet magna. Vivamus iaculis, sem ac varius tempor, dolor ex feugiat mauris, sodales consectetur lorem leo vel dui. Ut mi lorem, imperdiet quis hendrerit interdum, tincidunt sed sapien. Morbi ullamcorper ligula a quam venenatis, id vestibulum lectus lobortis. Ut mollis tortor sit amet arcu volutpat, at vestibulum tellus vulputate. Suspendisse luctus efficitur felis, sit amet scelerisque urna. Vivamus sem justo, volutpat id suscipit quis, finibus egestas neque. Nulla tempus pellentesque lectus id rhoncus. Sed varius felis eu mi eleifend, et lobortis augue laoreet.</p>
</div>


</div>

  )
}