import RingFooterGate from "./RingFooterGate"
import { getR2Url } from "@/lib/r2"

const RING_IMAGES = [
  "homepage/kananaskis.jpg",
  "homepage/myfriends.jpg",
  "homepage/bluecntower.jpg",
  "homepage/hiking.jpg",
  "videos/motacycles.jpg",
  "homepage/climbing.jpg",
  "homepage/aquarium.jpg",
  "photos/wave2earth2026/2.jpg",
  "homepage/morefriends.jpg",
  "homepage/yearning.jpg",
].map(getR2Url)

function ArrowIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.07102 11.3494L0.963068 10.2415L9.2017 1.98864H2.83807L2.85227 0.454545H11.8438V9.46023H10.2955L10.3097 3.09659L2.07102 11.3494Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="mb-16">
      <RingFooterGate images={RING_IMAGES} />

      <div className="px-4 sm:px-8 lg:px-28">
      <div className="max-w-6xl mx-auto py-8 flex flex-col items-center text-center md:flex-row md:justify-between md:items-center md:text-left">
        <div className="flex flex-col items-center md:items-start">
          <p className="text-4xl font-bold text-neutral-600 dark:text-neutral-300">
            jackson zhou
          </p>
          <a
            href="mailto:hello@jkzhou.ca"
            className="text-neutral-600 transition-all hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100"
          >
            hello@jkzhou.ca
          </a>
        </div>

        <div className="mt-6 flex flex-col items-center md:mt-0 md:items-end">
          <ul className="flex flex-wrap justify-center gap-4 text-neutral-600 dark:text-neutral-300 md:justify-end">
            <li>
              <a
                draggable={false}
                rel="noopener noreferrer"
                target="_blank"
                href="https://www.instagram.com/jkzhouu/"
                className="flex items-center transition-all hover:text-neutral-800 dark:hover:text-neutral-100"
              >
                <ArrowIcon />
                <p className="ml-2">instagram</p>
              </a>
            </li>
            <li>
              <a
                draggable={false}
                rel="noopener noreferrer"
                target="_blank"
                href="https://www.linkedin.com/in/jackson-zhou-9a5703297/"
                className="flex items-center transition-all hover:text-neutral-800 dark:hover:text-neutral-100"
              >
                <ArrowIcon />
                <p className="ml-2">linkedin</p>
              </a>
            </li>
            <li>
              <a
                draggable={false}
                href="/contact"
                className="flex items-center transition-all hover:text-neutral-800 dark:hover:text-neutral-100"
              >
                <ArrowIcon />
                <p className="ml-2">contact</p>
              </a>
            </li>
          </ul>

          <p className="mt-2 text-neutral-600 dark:text-neutral-300">
            © {new Date().getFullYear()} Jackson Zhou. All rights reserved
          </p>
        </div>
      </div>
      </div>
    </footer>
  )
}