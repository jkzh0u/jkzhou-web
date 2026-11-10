export type Project = {
  name: string;
  description?: string;
  /** Shown as written, e.g. "nov '26" */
  date?: string;
  /** Page on this site at /projects/[slug]. The card links there instead of to href */
  slug?: string;
  /** Where the card links to. Leave out for a card that isn't a link */
  href?: string;
  /** GitHub repo, shown as an icon next to the name */
  repo?: string;
  /** Shows the shimmering skeleton in place of the media */
  comingSoon?: boolean;
  /** Muted looping clip, from /public */
  video?: string;
  /** Still frame shown until the video plays, or on its own when there is no video */
  poster?: string;
  /** Sections of text on the project's page, shown beside the model */
  writeup?: WriteupSection[];
};

export type WriteupSection = {
  heading: string;
  paragraphs: string[];
  /** Shown as a table after the paragraphs */
  sites?: RadioSite[];
};

export type RadioSite = {
  name: string;
  /** In MHz, as written */
  frequencies: string[];
};

export const projects: Project[] = [
  {
    name: "opento",
    description:
      "live toronto dashboard for police calls, fire incidents, ttc and go alerts. built with next.js.",
    date: "nov '26",
    href: "https://opento.jkzhou.ca",
    repo: "https://github.com/jkzh0u/openTO",
    video: "/projects/openTO.mp4",
    poster: "/projects/openTO.jpg",
  },
  {
    name: "TETRA PiSDR",
    description: "portable pi-sdr, built into a portable case. made to monitor TETRA.",
    date: "feb '26",
    slug: "sdr",
    video: "/projects/sdr.mp4",
    poster: "/projects/sdr.jpg",
    writeup: [
      {
        heading: "what is this?",
        paragraphs: [
          "this was my first ever big hardware project. I'm very interested in radios, and always wanted to monitor the TTC radios. in Toronto, the Toronto Transit Commission (TTC) uses TETRA to communicate between control, subway operators, station attendants, and more. I actually struggled to find an application that can demodulate tetra that was avalible on linux. I ended up using gnuradio with an application called telive & osmotetra to demodulate the signal coming from my closest ttc relay."
        ],
      },
      {
        heading: "how does TETRA work?",
        paragraphs: [
          "TETRA (terrestrial trunked radio) is a digital radio standard, made for organisations like transit agencies, police and utilities. instead of giving every group its own fixed frequency, a tetra network is trunked. each site has a small pool of frequencies that everyone shares, and the network hands out a channel only while someone is talking.",
          "the frequency is split into four timeslots, so it can carry four conversations at once.",
          "one timeslot on each site's main carrier is the control channel, and every radio on the site listens to it. when someone presses talk, their radio asks for a channel there, the network picks a free timeslot and announces it, and every radio in that talkgroup jumps over to listen, like a big group call. when the call ends the slot goes back into the pool.",
        ],
      },
      {
        heading: "signal to audio",
        paragraphs: [
          "the antenna picks up the signal and the airspy mini turns it into data the computer can work with.",
          "gnu radio tunes in to the tetra channels and turns the radio signal back into the raw bits that were sent.",
          "osmotetra reads those bits, sorting out the control messages from the voice.",
          "telive puts it all together on screen, showing which talkgroups are active and playing the audio from each call.",
        ],
      },
      {
        heading: "the TTC network",
        paragraphs: [
          "the TTC's network is split into sites, each with its own short list of frequencies in the 400 mhz range. underground zones 1 to 13 serves the subway, and the rest are above ground sites named after where they are, like cn tower and finch.",
          "following a site's control channel is how you see every call on it, even when the voice itself is on another frequency.",
        ],
        sites: [
          { name: "underground zones 1 - 13", frequencies: ["422.2625", "422.325", "422.3625", "422.425", "422.4625", "422.525", "422.5625", "422.625"] },
          { name: "cn tower", frequencies: ["422.6625", "423.4125", "423.5125"] },
          { name: "finch", frequencies: ["422.6875", "423.3875", "423.5625"] },
          { name: "shipp", frequencies: ["412.9625", "423.6125", "423.7125"] },
          { name: "malvern", frequencies: ["423.4875", "423.5875", "423.7625"] },
          { name: "greenwood", frequencies: ["412.0625", "412.2125", "412.6125"] },
          { name: "hillcrest", frequencies: ["412.1125", "423.2875", "423.6875"] },
          { name: "wilson", frequencies: ["413.1875", "423.3625", "423.4625"] },
          { name: "mcbrien", frequencies: ["412.0375", "423.5375", "423.6625"] },
          { name: "arrow", frequencies: ["412.0375", "423.3125", "423.7375"] },
          { name: "birchmount", frequencies: ["423.3375", "423.4375", "423.6375"] },
        ],
      },
      {
        heading: "problems",
        paragraphs: [
          "I have a few problems with this project. the most annoying one being that I believe the UPS I recieved was defective. for some reason, if I keep it charging, it stays on, but after a while on battery, the pi experiences a low power event and shuts off. I have no idea why this happens and its a hassle to always have to reboot the pi.",
          "another thing is the antenna. the foldable UHF antenna I find it to be very spotty. in my house, it only recieves in some areas as you move around. my solution to this is to connect the piSDR to an old TV antenna that is mounted on the roof, suprisingy works very well even though the TV antenna isnt in its usual range."
        ]
      },
    ],
  },
];
