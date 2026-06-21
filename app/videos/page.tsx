import VideoGallery, { type VideoItem } from "../components/VideoGallery";

const videos: VideoItem[] = [
  {
    title: "first vlog",
    tag: "vlog",
    year: "2026",
    src: "/videos/first-vlog.mp4",
    poster: "/homepage/filmmaker.jpg",
    desc: "an introduction. who am i?",
    aspectRatio: 3 / 2,
  },
  {
    title: "how to host a summer function",
    tag: "vlog",
    year: "2026",
    src: "/videos/summerfunction.mp4",
    poster: "/videos/havefun.jpeg",
    desc: "its finally summer!",
    aspectRatio: 3 / 2,
  },
  {
    title: "you should make new friends",
    tag: "vlog",
    year: "2026",
    src: "/videos/newfriends.mov",
    poster: "/videos/havefun.jpeg",
    desc: "test!",
    aspectRatio: 3 / 2,
  },
];

export default function VideosPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <section className="mx-auto w-full max-w-7xl px-4 py-24">
        <div className="relative mb-20">
          <p className="mb-5 text-sm uppercase tracking-[0.45em] text-foreground/35">
            moving images
          </p>

          <h1 className="text-[clamp(4.5rem,14vw,12rem)] font-bold leading-[0.78] tracking-tight">
            video
            vault
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-foreground/50">
            this page is still under construction, but here are a few videos i've made. more to come soon!
          </p>
        </div>

        <VideoGallery videos={videos} />

      </section>
    </main>
  );
}