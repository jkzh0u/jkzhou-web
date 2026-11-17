export type Topic = "radio" | "web" | "infra";

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
  /** Image for the link preview card, if different from the poster */
  ogImage?: string;
  /** A drawn figure shown in place of media, on the card and the project's page */
  diagram?: "homelab";
  /** Something live shown under the video on the project's page: opento's numbers, or ABCanto to try out */
  widget?: "opento" | "abcanto";
  /** What it is about, shown on the project's own page */
  topics?: Topic[];
  /** Sections of text on the project's page, shown beside the model */
  writeup?: WriteupSection[];
};

export type WriteupSection = {
  heading: string;
  paragraphs: string[];
  /** Shown as a table after the paragraphs */
  sites?: RadioSite[];
  /** Shown as a block of commands after the paragraphs */
  code?: string;
};

export type RadioSite = {
  name: string;
  /** In MHz, as written */
  frequencies: string[];
};

export const projects: Project[] = [
  {
    name: "C62 TETRA project - WIP",
    description:
      "firmware that turns the Retevis C62 handheld into a TETRA receiver that follows calls and roams between cells on its own.",
    slug: "c62",
    date: "nov '26",
    topics: ["radio"],
    repo: "https://github.com/jkzh0u/OpenRTX",
    video: "/projects/c62.mp4",
    poster: "/projects/c62.jpg",
    writeup: [
      {
        heading: "what is this?",
        paragraphs: [
          "the [piSDR](/projects/sdr) could listen in on TETRA, but it's a raspberry pi, an SDR and a battery board in a case, running a whole stack of software. I wanted the same thing in one handheld radio I could carry around.",
          "I came across Wojciech Kaczmarski's [blog article](https://m17project.org/2026/10/27/an-unmodified-c62-can-not-decode-tetra-or-can-it/) about how a cheap C62 can be used to monitor TETRA. the software was a proof of concept, and it didn't support multiple carrier frequencies. this fork of the firmware adds that, specifically for the TTC in Toronto, which is the only TETRA network I have around me.",
          "a receiver that decodes TETRA isn't the same as one you can use, though. you had to tune it by hand, it lost the call whenever the network moved it to another frequency, and it had no idea which of the network's talkgroups you cared about. my fork fixes that.",
        ],
      },
      {
        heading: "following calls and roaming",
        paragraphs: [
          "as I covered on the [piSDR page](/projects/sdr), a TETRA call starts on the control channel and then moves to a traffic carrier. the proof of concept had no multi carrier support: it could only stay on a single channel, so it lost the call as soon as the network moved it. I added a call follower that jumps to the carrier the network picks, and a fast retune in the BK4819 driver so the radio doesn't restart its receiver every time it does.",
          "I also added automatic cell tracking, so the radio moves between sites by itself as you move. it remembers the cell it just left, and shows where it came from.",
        ],
      },
      {
        heading: "a built-in channel list",
        paragraphs: [
          "the C62 has nowhere to store settings, so the channel list has to live in the firmware itself. I added a read-only codeplug built into the firmware, with a build option for a built-in channel list, so a network's sites, talkgroups and radio names can be baked in when you build. the list I wrote is for Toronto's TTC: every above ground site, all 13 underground zones, and the identities of the talkgroups and train runs.",
          "talkgroups can have names, so the screen says Transit Control or Run 253 instead of a number. filters, selected with # and *, pick which groups you hear. my TTC list has a Riding filter for being on a train: every line's line calls plus Transit Control. holding a talkgroup locks onto it, and the radio plays one call at a time. red alarms come through every filter.",
        ],
      },
      {
        heading: "before you build",
        paragraphs: [
          "I wrapped it all up on top of Wojciech's [OpenRTX fork](https://github.com/sp5wwp/OpenRTX/tree/c62/tetra), which is itself built on [turnrye's OpenRTX fork](https://github.com/turnrye/OpenRTX). turnrye's one is focused on M17, and it uses the DSP firmware part of the radio, setting the baseband sample rate to 48kHz.",
          "the build pulls [ETSI](https://www.etsi.org)'s codebooks for their ACELP vocoder. they end up embedded in the firmware, so don't distribute the binaries. the source is in [my fork](https://github.com/jkzh0u/OpenRTX), and you build it yourself.",
        ],
      },
      {
        heading: "build it yourself",
        paragraphs: [
          "you only need [docker](https://www.docker.com) and git. the image holds the whole toolchain (the Zephyr SDK, west, cmake and ninja), and your source stays on your disk. on windows, use a WSL2 shell with the folder inside WSL.",
          "the first command makes a folder for the workspace, since west puts the Zephyr fork and the radio's modules next to the OpenRTX checkout. building the image takes 5 to 10 minutes and about 2 GB, and the first firmware build downloads the Zephyr fork. after that, running the same docker command again only rebuilds what changed.",
          "the -DC62_CHANNELS option builds the TTC channel list into the firmware. to use another network, copy scripts/c62/channels/ttc_tetra.h, fill in your own sites and talkgroups, and point the option at your copy. the option is remembered, so later builds keep the list.",
        ],
        code: `mkdir c62-ws && cd c62-ws
git clone -b c62/channels https://github.com/jkzh0u/OpenRTX.git

# build the toolchain image, once
docker build -t openrtx-c62 OpenRTX/scripts/c62

# build the firmware
docker run --rm -it --user "$(id -u):$(id -g)" \\
    -v "$PWD":/work openrtx-c62 \\
    c62-build -DC62_CHANNELS=scripts/c62/channels/ttc_tetra.h`,
      },
      {
        heading: "flashing it",
        paragraphs: [
          "the build gives you two files. zephyr.bin goes at 0x000000 and dsp_firmware.bin at 0x100000, both under OpenRTX/build_c62/zephyr. the DSP firmware is downloaded and hash-checked during the build.",
          "flash them with [cskburn](https://github.com/LISTENAI/cskburn/releases) over the Kenwood programming cable. back up your radio's own flash first, because it's different for every unit.",
          "to enter burn mode, turn the radio off, hold the lower side key, power on, then let go of the key. the screen stays dark. don't press the main PTT while flashing, since it shares a line with the boot ROM. cskburn resets the radio after each command, so enter burn mode again before each one. replace /dev/ttyUSB0 with your cable's port.",
        ],
        code: `# 1. back up the radio's flash (burn mode first)
cskburn -s /dev/ttyUSB0 -C 6 -b 115200 -v --read 0x0:0x400000:backup.bin

# 2. flash the firmware (burn mode again)
cskburn -s /dev/ttyUSB0 -C 6 -b 115200 -v --verify-all \\
    0x100000 OpenRTX/build_c62/zephyr/dsp_firmware.bin \\
    0x000000 OpenRTX/build_c62/zephyr/zephyr.bin`,
      },
      {
        heading: "using it",
        paragraphs: [
          "it starts in VFO mode on 430.000 MHz, in M17. TETRA is available through the quick menu key: hold the side key and press 5 to switch between M17, FM and TETRA. with the channel list built in, press ESC for memory mode, then up and down to step through the channels. each channel sets its own mode, so a TETRA channel goes straight to T mode.",
        ],
      },
    ],
  },
  {
    name: "ABCanto",
    description:
      "find the cantonese word by how it sounds, what it means, or what it literally means. built for ABCs like me.",
    date: "nov '26",
    slug: "abcanto",
    topics: ["web"],
    href: "https://abcanto.jkzhou.ca",
    repo: "https://github.com/jkzh0u/ABCanto",
    video: "/projects/ABCanto.mp4",
    poster: "/projects/ABCanto.jpg",
    widget: "abcanto",
    writeup: [
      {
        heading: "what is this?",
        paragraphs: [
          "ABCanto is a play on words: ABC, for asian-born canadian, plus canto, for cantonese.",
        ],
      },
      {
        heading: "why I built this",
        paragraphs: [
          "I grew up as an ABC in a cantonese-speaking household. my parents are immigrants who don't speak a word of english, so I've been the family translator for as long as I can remember: letters, documents, forms, literally everything that has english.",
          "like a lot of ABCs, I can speak and understand cantonese fluently, but reading and writing it is another story. I'll know exactly how a word sounds, then get completely stuck the moment I try to text it to my parents. other times I know what something literally means in english (飛機 is literally a \"flying machine\") but not how to say or write it.",
          "google translate is great, but it's built for translating sentences, not for finding the word that's on the tip of your tongue. so I built the tool I wanted.",
        ],
      },
      {
        heading: "three ways to search",
        paragraphs: [
          "how it sounds: type it the way you'd spell it out, like m goi → 唔該.",
          "what it means: search in plain english, like \"thank you\".",
          "literal translation: describe it word by word, like \"flying machine\" → 飛機.",
        ],
      },
      {
        heading: "how it works",
        paragraphs: [
          "sound search splits what you type into syllables (spaces are optional) and matches each one to jyutping, the standard way to romanize cantonese. it knows the ways people actually spell things out, like mixing up n and l, dropping the \"ng\", or writing ch or ts instead of c. tones are optional too.",
          "meaning search looks through the english definitions, with exact matches ranked above partial ones. literal search matches each word you type to each character's own meaning, so \"flying machine\" becomes 飛 fly + 機 machine → 飛機.",
          "results are ranked by how good the match is, then by how common the word is in spoken cantonese, with a boost for words that are specific to cantonese. the dictionary comes from CC-Canto and CC-CEDICT, and the word frequencies from HKCanCor.",
          "it's next.js with a hono api, and it runs on my homelab with the same github actions and portainer setup as this site.",
        ],
      },
      {
        heading: "who it's for",
        paragraphs: [
          "if you're an ABC (or anyone, really) in the same boat, I hope it helps you too.",
        ],
      },
    ],
  },
  {
    name: "opento",
    description:
      "live toronto dashboard for police calls, fire incidents, ttc and go alerts. built with next.js.",
    date: "nov '26",
    slug: "opento",
    topics: ["web"],
    widget: "opento",
    href: "https://opento.jkzhou.ca",
    repo: "https://github.com/jkzh0u/openTO",
    video: "/projects/openTO.mp4",
    poster: "/projects/openTO.jpg",
    writeup: [
      {
        heading: "what is this?",
        paragraphs: [
          "opento is one page that shows what's happening around toronto right now. police calls, fire incidents, ttc alerts and go transit updates are all public, but they're spread across four different sites. I wanted all of them on one newspaper style front page that fits on one screen.",
        ],
      },
      {
        heading: "where the data comes from",
        paragraphs: [
          "police calls come from toronto police's public calls for service map, which runs on arcgis. I ask it for the latest 2000 calls, newest first.",
          "fire incidents come from toronto fire's live cad feed, an xml file that lists every active incident with its alarm level and the trucks sent to it.",
          "ttc alerts come from the ttc's own alerts api, go train and bus updates from metrolinx, and the weather and air quality from open-meteo.",
        ],
      },
      {
        heading: "keeping it live",
        paragraphs: [
          "the server loads every feed when you open the page, so it never shows up empty, then your browser checks every feed again once a minute. a feed gets 8 seconds to answer before it's skipped, so one slow site can't take the whole page down.",
          "anything that shows up in a check that wasn't there the last time goes into the breaking news banner at the top.",
        ],
      },
      {
        heading: "maps",
        paragraphs: [
          "police calls are dots on a map of toronto's 16 police divisions, with stats on what kinds of calls are coming in and which division is the busiest.",
          "the fire feed doesn't give an address for every call, just the nearest fire station, so that's where each incident goes on the fire map. it also only lists the trucks on a call right now, so the timeline of trucks arriving and leaving is built by comparing one check to the next.",
          "the mini subway map marks closed stations and slow zones from the ttc's live alerts. ",
        ],
      },
      {
        heading: "what's next",
        paragraphs: [
          "right now the fire and police history only lives in your browser. I want to store it in a database (probably sqlite) so it's there for everyone, and figure out what the HP police division actually is so I can label it properly.",
        ],
      },
    ],
  },
  {
    name: "homelab",
    description:
      "the home server that runs this site, opento and ABCanto, with automatic deploys from github.",
    date: "april '26",
      slug: "homelab",
      topics: ["infra"],
    diagram: "homelab",
    writeup: [
      {
        heading: "what is this?",
        paragraphs: [
          "this site isn't on vercel or any other host. it runs in docker on a server in my house, and so do opento and ABCanto. I wanted to learn how the whole thing works, from the code to the domain name.",
        ],
      },
      {
        heading: "deploys",
        paragraphs: [
          "every push to main starts a github actions workflow. it builds the site into a docker image and pushes it to github's container registry, tagged :latest and with the commit, so I can roll back to any version.",
          "then the workflow tells portainer, which manages docker on the server, to pull the new image and redeploy the stack. portainer's stack webhooks need the paid edition, so it goes through portainer's api instead. at the end it prunes the old image so they don't pile up on the disk.",
        ],
      },
      {
        heading: "getting to the site",
        paragraphs: [
          "cloudflare handles dns for jkzhou.ca. requests come in to nginx proxy manager, which holds the ssl certificates and sends each domain to the right container, so jkzhou.ca, opento.jkzhou.ca and abcanto.jkzhou.ca can all live on the same machine.",
        ],
      },
      {
        heading: "photos and videos",
        paragraphs: [
          "my photos and videos are too big to put in the docker image, so they live in a cloudflare r2 bucket served from assets.jkzhou.ca. I drop files into a samba share on the home server and they sync up to r2, so putting photos online is just copying them into a folder.",
        ],
      },
      {
        heading: "what's next",
        paragraphs: [
          "I want to set up cloudflare warp so I can get to the server when I'm away from home, and maybe put it behind cloudflare zero trust.",
        ],
      },
    ],
  },
  {
    name: "TETRA PiSDR",
    description: "portable pi-sdr, built into a portable case. made to monitor TETRA.",
    date: "feb '26",
    slug: "sdr",
    topics: ["radio"],
    video: "/projects/sdr.mp4",
    poster: "/projects/sdr.jpg",
    ogImage: "/projects/sdr-og.png",
    writeup: [
      {
        heading: "what is this?",
        paragraphs: [
          "this was my first ever big hardware project. I'm very interested in radios, and always wanted to monitor the TTC radios. in Toronto, the Toronto Transit Commission (TTC) uses TETRA to communicate between control, subway operators, station attendants, and more. I actually struggled to find an application that can demodulate TETRA that runs on linux. I ended up using gnuradio with an application called telive & osmotetra to demodulate the signal coming from my closest TTC frequency."
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
          "the TTC's network is split into sites, each with its own short list of frequencies in the 400 mhz range. underground zones 1 to 13 serve the subway, and the rest are above ground sites named after where they are, like cn tower and finch.",
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
          "I have a few problems with this project. the most annoying one being that I believe the UPS I received was defective. for some reason, if I keep it charging, it stays on, but after a while on battery, the pi experiences a low power event and shuts off. I have no idea why this happens and it's a hassle to always have to reboot the pi.",
          "another thing is the antenna. I find the foldable UHF antenna to be very spotty. in my house, it only received in some areas as you move around. my solution to this is to connect the piSDR to an old TV antenna that is mounted on the roof, surprisingly works very well even though the TV antenna isn't in its tuned range."
        ]
      },
      
    ],
  },
];
