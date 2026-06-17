"use client";

import FadeInSection from "./FadeInSection";
import TiltCard from "./TiltCard";

export default function AboutMe() {
  return (
    <section className="mx-auto my-36 w-full max-w-6xl px-4">
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1.1fr_0.9fr]">
        <FadeInSection delay={100}>
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.35em] text-foreground/40">
              about me
            </p>

            <h2 className="max-w-3xl text-[clamp(3rem,8vw,6rem)] font-bold leading-[0.95] tracking-tight">
              i make cool looking things
            </h2>

            <div className="mt-10 max-w-xl space-y-6 text-lg leading-relaxed text-foreground/60">
              <p>
                i'm jackson, a 16 year old photographer, filmmaker, and creator based in
                toronto!
              </p>

              <p>
                lately i've been documenting my life through photos, videos, and
                random projects with my friends.
              </p>

              <p>
                all of this started in 2023 when i first picked up photography using my dad's old camera. 
              </p>
            </div>
          </div>
        </FadeInSection>

        <FadeInSection delay={300}>
<div className="flex h-full items-center justify-center">
  <TiltCard className="w-[min(80vw,380px)] rotate-[4deg] rounded-[3px] bg-[#f8f7f3] p-4 shadow-[0_35px_90px_rgba(0,0,0,0.45)]">
    <div className="aspect-[4/5] overflow-hidden bg-neutral-900">
      <img
        src="/homepage/aboutme.jpg"
        alt="this is a photo of me!"
        className="h-full w-full object-cover"
      />
    </div>

    <div className="flex h-[78px] items-center justify-center">
      <p className="translate-y-[2px] text-center text-[18px] font-semibold uppercase tracking-[0.22em] text-neutral-700">
        thats me!
      </p>
    </div>
  </TiltCard>
</div>
        </FadeInSection>
      </div>
    </section>
  );
}