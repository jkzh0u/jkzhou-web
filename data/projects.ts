export type Project = {
  name: string;
  description?: string;
  /** Shown as written, e.g. "nov '26" */
  date?: string;
  /** Where the card links to. Leave out for a card that isn't a link */
  href?: string;
  /** GitHub repo, shown as an icon next to the name */
  repo?: string;
  /** Shows the shimmering skeleton in place of the media */
  comingSoon?: boolean;
  /** Muted looping clip, from /public */
  video?: string;
  /** Still frame shown until the video plays */
  poster?: string;
};

export const projects: Project[] = [
  {
    name: "openTO",
    description:
      "Live Toronto dashboard for police calls, fire incidents, TTC and GO alerts. Built with Next.js.",
    date: "nov '26",
    href: "https://opento.jkzhou.ca",
    repo: "https://github.com/jkzh0u/openTO",
    video: "/projects/openTO.mp4",
    poster: "/projects/openTO.jpg",
  },
  {
    name: "coming soon :)",
    comingSoon: true,
  },
];
