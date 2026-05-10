  import Image from "next/image";
import type { Metadata } from "next";
import PhotosShowcase from "../components/PhotosShowcase";

export const metadata: Metadata = {
  title: "jackson zhou: photos",
  description: "Homepage",
};

export default function Home() {
  return (


<div className="">
  <p className="sm:text-9xl text-6xl font-bold my-7 overflow-hidden">photos</p>

<section className="-mx-4 sm:-mx-8 lg:-mx-28">
  <PhotosShowcase/>
  
</section>
    <div className="columns-3 gap-6 space-y-6">
    <a href="photos/example">
    <img className="aspect-rectangle" src="https://images.unsplash.com/photo-1434394354979-a235cd36269d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2902&q=80" />
    </a>
    </div>
    
</div>
  );
}
