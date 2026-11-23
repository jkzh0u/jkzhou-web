// The C62 firmware's menus, for the interactive menu at /projects/c62/settings.
// Taken from the firmware's UI code (OpenRTX, c62/channels branch): the same
// entries, values and starting values as on the radio.
// In text, {name} is drawn as a key, e.g. {green} or {0}.

export type SimValue = {
  label: string;
  /** What this value does, shown while it's picked */
  note?: string;
};

export type SimEntry = {
  id: string;
  name: string;
  explain: string;
  /** A setting changed with {up} / {down} after {green} */
  values?: SimValue[];
  start?: number;
  /** A value typed on the keypad on the radio, shown here as it starts */
  typed?: string;
  /** Opens a list of its own */
  menu?: SimMenu;
  /** Opens a page that isn't a list: a screenshot or a few lines */
  page?: { image?: string; alt?: string; lines?: string[] };
  /** The reset page: {green} twice puts every setting back */
  reset?: boolean;
};

export type SimMenu = {
  id: string;
  title: string;
  explain: string;
  entries: SimEntry[];
};

const onOff = (on: string, off: string): SimValue[] => [
  { label: "ON", note: on },
  { label: "OFF", note: off },
];

const CTCSS = [
  "67.0", "69.3", "71.9", "74.4", "77.0", "79.7", "82.5", "85.4", "88.5", "91.5", "94.8", "97.4",
  "100.0", "103.5", "107.2", "110.9", "114.8", "118.8", "123.0", "127.3", "131.8", "136.5", "141.3",
  "146.2", "151.4", "156.7", "159.8", "162.2", "165.5", "167.9", "171.3", "173.8", "177.3", "179.9",
  "183.5", "186.2", "189.9", "192.8", "196.6", "199.5", "203.5", "206.5", "210.7", "218.1", "225.7",
  "229.1", "233.6", "241.8", "250.3", "254.1",
];

// Squelch: off, then -127 + level * 66 / 15 dBm for levels 1 to 15 (the FM mode's formula)
const SQUELCH: SimValue[] = [
  { label: "OFF", note: "the speaker is always open: you hear the noise between signals too." },
  ...Array.from({ length: 15 }, (_, i) => {
    const level = i + 1;
    const dbm = -127 + Math.trunc((level * 66) / 15);
    return {
      label: `${dbm} dBm`,
      note:
        level <= 3
          ? "opens for very weak signals. you'll hear some noise bursts."
          : level <= 8
            ? "a usual setting: weak stations come through, the hiss doesn't."
            : "only strong signals open it. good in a noisy place, but distant stations get cut.",
    };
  }),
];

const display: SimMenu = {
  id: "display",
  title: "Display",
  explain: "the screen. saved, so they come back at power on.",
 
  entries: [
    {
      id: "brightness",
      name: "Brightness",
      explain: "how bright the backlight is. side key + {7} / {8} change it from the main screen too.",
      values: Array.from({ length: 20 }, (_, i) => ({ label: String((i + 1) * 5) })),
      start: 19,
    },
    {
      id: "timer",
      name: "Timer",
      explain:
        "how long the screen stays lit after the last key. a TETRA call wakes it and keeps it on until the call ends.",
      values: [
        { label: "OFF", note: "the screen never goes dark. uses more battery." },
        ...["5 s", "10 s", "15 s", "20 s", "25 s", "30 s", "1 min", "2 min", "3 min", "4 min", "5 min", "15 min", "30 min", "45 min", "1 h"].map(
          (label) => ({ label }),
        ),
      ],
      start: 6,
    },
    {
      id: "battery-icon",
      name: "Battery Icon",
      explain: "how the battery shows in the top right corner.",
      values: onOff("a little battery icon.", "the charge as a percentage, like 80%."),
      start: 1,
    },
  ],
};

const radio: SimMenu = {
  id: "radio",
  title: "Radio",
  explain:
    "the repeater offset and the tuning step. these belong to the frequency you're on, and only matter for transmitting in FM.",
 
  entries: [
    {
      id: "offset",
      name: "Offset",
      explain:
        "how far the transmit frequency is from the receive one, for repeaters (5 MHz on 70 cm, 600 kHz on 2 m). typed on the number keys on the radio.",
      typed: "0.000",
    },
    {
      id: "direction",
      name: "Direction",
      explain: "whether you transmit above or below the receive frequency.",
      values: [
        { label: "+", note: "transmit above: receive 443.150, transmit 448.150." },
        { label: "-", note: "transmit below." },
      ],
      start: 0,
    },
    {
      id: "step",
      name: "Step",
      explain: "how far {up} / {down} move the frequency in VFO mode.",
      values: ["1 kHz", "5 kHz", "6.25 kHz", "10 kHz", "12.5 kHz", "15 kHz", "20 kHz", "25 kHz", "50 kHz", "100 kHz"].map((label) => ({
        label,
        note:
          label === "12.5 kHz"
            ? "TETRA and most UHF channels sit on 12.5 kHz steps."
            : label === "6.25 kHz"
              ? "for the TETRA carriers that sit between 12.5 kHz steps."
              : undefined,
      })),
      start: 4,
    },
  ],
};

const m17: SimMenu = {
  id: "m17",
  title: "M17",
  explain: "M17 is an open digital voice mode made by hams. these are for transmitting in it.",
 
  entries: [
    {
      id: "callsign",
      name: "Callsign",
      explain: "your callsign, sent with every M17 transmission. typed on the keypad like an old phone.",
      typed: "N0CALL",
    },
    {
      id: "meta",
      name: "Meta Txt",
      explain: "a short text sent with your transmissions, shown on the other radio. 7 characters fit here, then a *.",
      typed: "OpenRTX",
    },
    {
      id: "can",
      name: "CAN",
      explain: "channel access number: M17's version of a CTCSS tone, to share a frequency between groups.",
      values: Array.from({ length: 16 }, (_, i) => ({ label: String(i) })),
      start: 0,
    },
    {
      id: "can-rx",
      name: "CAN RX Check",
      explain: "whether the CAN also filters what you hear.",
      values: onOff("only transmissions with your CAN play.", "every M17 transmission plays."),
      start: 1,
    },
  ],
};

const fm: SimMenu = {
  id: "fm",
  title: "FM",
  explain:
    "analog FM, for repeaters, simplex and weather radio. width, power and tones belong to the channel you're on; squelch and roger beep are saved for the whole radio.",
 
  entries: [
    {
      id: "squelch",
      name: "Squelch",
      explain: "the signal level that opens the speaker. side key + {up} / {down} change it from the main screen.",
      values: SQUELCH,
      start: 4,
    },
    {
      id: "width",
      name: "Width",
      explain: "the channel bandwidth. it has to match the station, or voices sound quiet or distorted. side key + {4} too.",
      values: [
        { label: "12.5 kHz", note: "narrow: most repeaters and business radio today." },
        { label: "25 kHz", note: "wide: older systems, weather radio, marine." },
      ],
      start: 1,
    },
    {
      id: "power",
      name: "Power",
      explain: "transmit power. use the least that gets through: it saves battery. side key + {6} too.",
      values: [
        { label: "1 W", note: "close range, longest battery." },
        { label: "2.5 W" },
        { label: "5 W", note: "full power, the default." },
      ],
      start: 2,
    },
    {
      id: "tone-mode",
      name: "Tone mode",
      explain:
        "CTCSS: an almost silent low tone under your voice. repeaters use it to know who's meant for them. side key + {1} too.",
      values: [
        { label: "None", note: "no tones: you hear everything above the squelch." },
        { label: "Encode", note: "sends your TX tone. most repeaters only open for the right tone." },
        { label: "Decode", note: "the speaker only opens for signals with your RX tone, so other users of the frequency stay quiet." },
        { label: "Both", note: "encode and decode: tone squelch." },
      ],
      start: 0,
    },
    {
      id: "tx-tone",
      name: "TX tone",
      explain: "the tone you send with Encode. the repeater's listing says which one. side key + {2} / {3} change both tones.",
      values: CTCSS.map((label) => ({ label })),
      start: 0,
    },
    {
      id: "rx-tone",
      name: "RX tone",
      explain: "the tone the speaker waits for with Decode.",
      values: CTCSS.map((label) => ({ label })),
      start: 0,
    },
    {
      id: "talk-permit",
      name: "Talk permit",
      explain:
        "a tone in the radio's own speaker when you press PTT, telling you to start talking, like on motorola radios. it isn't transmitted: the radio keys up just after it.",
      values: [
        { label: "Off", note: "keys up as soon as you press PTT." },
        { label: "Beep", note: "one beep." },
        { label: "Double", note: "two quick beeps." },
        { label: "Motorola", note: "three fast high beeps, \"dit-dit-dit\", like a motorola radio." },
        { label: "Moto clear", note: "the same, then one more beep: on motorola trunked systems that means the call isn't encrypted." },
        { label: "Chime", note: "high, then low." },
      ],
      start: 0,
    },
    {
      id: "roger",
      name: "Roger beep",
      explain: "a sound sent when you let go of PTT, so the others know you've finished.",
      values: [
        { label: "Off" },
        { label: "Classic", note: "two rising tones." },
        { label: "Single", note: "one short beep." },
        { label: "Double", note: "two short beeps." },
        { label: "Chirp", note: "three quick rising tones." },
        { label: "Bloop", note: "falling, then low." },
        { label: "Morse K", note: "dah dit dah: K is morse for \"over\"." },
        { label: "Sweep", note: "a rising whistle." },
        { label: "Moto MDC", note: "the \"brrrp\" of a motorola data burst. there's no real ID in it." },
      ],
      start: 0,
    },
  ],
};

const tetra: SimMenu = {
  id: "tetra",
  title: "TETRA",
  explain: "the TETRA receiver (T mode). all on at first. here {up} turns a setting on and {down} turns it off.",
 
  entries: [
    {
      id: "follow",
      name: "Follow calls",
      explain: "a TETRA call starts on the main carrier, then the network moves it to another frequency.",
      values: onOff(
        "retunes to the carrier the call moved to, then comes back when it ends.",
        "stays on the main carrier: you see calls elsewhere but don't hear them.",
      ),
      start: 0,
    },
    {
      id: "join",
      name: "Late join",
      explain: "what happens when a call ends while another one is going on elsewhere.",
      values: onOff(
        "joins a call still going on on another carrier, highest priority first.",
        "only follows calls it sees start.",
      ),
      start: 0,
    },
    {
      id: "roam",
      name: "Cell tracking",
      explain: "a TETRA network is many cells. as you move, a different one is strongest.",
      values: onOff(
        "moves to a stronger neighbour cell when the signal gets weak, and searches when it's lost.",
        "stays on the channel you picked. holding {0} still searches once.",
      ),
      start: 0,
    },
    {
      id: "alarm",
      name: "Alarm beep",
      explain: "calls to talkgroups marked as alarms in your channel list.",
      values: onOff("the screen turns red and it beeps three times.", "red screen only."),
      start: 0,
    },
    {
      id: "keep-filter",
      name: "Keep filter",
      explain: "the talkgroup filter you pick with {#} and {*}.",
      values: onOff("comes back at power on.", "starts at TG All every time."),
      start: 0,
    },
    {
      id: "afc",
      name: "Freq. correct",
      explain:
        "the C62 decodes TETRA best about 1.6 kHz off the channel frequency, plus its own crystal error.",
      values: onOff(
        "finds the best offset by itself within about 20 s, and remembers it at power off.",
        "tunes exactly to the channel frequency.",
      ),
      start: 0,
    },
  ],
};

const accessibility: SimMenu = {
  id: "accessibility",
  title: "Accessibility",
  explain: "shortcut mode and spoken prompts.",
 
  entries: [
    {
      id: "latch",
      name: "Macro Latch",
      explain: "the side key opens shortcut mode: side key + a number does something (brightness, power, mode...).",
      values: onOff(
        "a long press of the side key keeps shortcut mode on until you press it again.",
        "shortcuts only work while you hold the side key.",
      ),
      start: 0,
    },
    {
      id: "voice",
      name: "Voice",
      explain: "spoken prompts that read menus and values out.",
      values: [
        { label: "OFF" },
        { label: "Beep", note: "a beep on each key, no voice." },
        { label: "1", note: "a few words." },
        { label: "2" },
        { label: "3", note: "the most detail." },
      ],
      start: 0,
    },
    {
      id: "phonetic",
      name: "Phonetic",
      explain: "how the voice spells letters.",
      values: onOff("alpha, bravo, charlie.", "a, b, c."),
      start: 1,
    },
  ],
};

const settings: SimMenu = {
  id: "settings",
  title: "Settings",
  explain: "seven pages. press {green} on one to open it.",
  entries: [
    { id: "display", name: "Display", explain: display.explain, menu: display },
    { id: "radio", name: "Radio", explain: radio.explain, menu: radio },
    { id: "m17", name: "M17", explain: m17.explain, menu: m17 },
    { id: "fm", name: "FM", explain: fm.explain, menu: fm },
    { id: "tetra", name: "TETRA", explain: tetra.explain, menu: tetra },
    { id: "accessibility", name: "Accessibility", explain: accessibility.explain, menu: accessibility },
    {
      id: "defaults",
      name: "Default Settings",
      explain:
        "puts every setting back to how it started, and the VFO back to 430.000 MHz. press {green} once to arm it and again to reset. your channel list isn't touched.",
      reset: true,
    },
  ],
};

export const topMenu: SimMenu = {
  id: "menu",
  title: "Menu",
  explain: "the main menu. {green} on the main screen opens it, {red} goes back.",
  entries: [
    {
      id: "banks",
      name: "Banks",
      explain: "groups of channels. the C62's channel list has no banks, so it's empty.",
      page: { lines: ["No banks"] },
    },
    {
      id: "channels",
      name: "Channels",
      explain: "every channel in your channel list. {green} tunes to one, and each channel brings its own mode.",
      page: { lines: ["Your channel list", "from channels.bin"] },
    },
    {
      id: "contacts",
      name: "Contacts",
      explain: "an address book for digital calls. TETRA talkgroups get their names from the channel list instead.",
      page: { lines: ["No contacts"] },
    },
    { id: "settings", name: "Settings", explain: settings.explain, menu: settings },
    {
      id: "info",
      name: "Info",
      explain: "the firmware version, battery, signal strength and memory use. handy for bug reports.",
      page: { image: "/projects/c62-manual/menu-10-info.png", alt: "info page with version, battery, RSSI and heap" },
    },
    {
      id: "field-test",
      name: "Field test",
      explain: "what the TETRA receiver knows right now, like the service screen of a real TETRA radio.",
      page: { image: "/projects/c62-manual/15-field-test.png", alt: "field test screen with lock, signal and cell" },
    },
    {
      id: "about",
      name: "About",
      explain: "who made the firmware: my fork first, then the OpenRTX authors.",
      page: { lines: ["C62 fork:", "Jackson Zhou", "jkzhou.ca", "OpenRTX by:", "..."] },
    },
  ],
};

/** Every setting with values, by id path, for resetting */
export function allSettings(menu: SimMenu = topMenu, path = ""): { key: string; start: number }[] {
  return menu.entries.flatMap((entry) => {
    const key = `${path}/${entry.id}`;
    if (entry.menu) return allSettings(entry.menu, key);
    if (entry.values) return [{ key, start: entry.start ?? 0 }];
    return [];
  });
}

/*
 * Roger beeps, as the firmware plays them (core/roger_beep.c): tones in Hz
 * (0 is silence) and how long each lasts, in ms. The transmitter changes
 * frequency without a gap, so a player should too.
 */
export type RogerStep = { hz: number; ms: number };

export const rogerStyles: { name: string; note: string }[] = [
  { name: "Classic", note: "two rising tones" },
  { name: "Single", note: "one short beep" },
  { name: "Double", note: "two short beeps" },
  { name: "Chirp", note: "three quick rising tones" },
  { name: "Bloop", note: "falling, then low" },
  { name: "Morse K", note: "dah dit dah: K is morse for \"over\"" },
  { name: "Sweep", note: "a rising whistle" },
  { name: "Moto MDC", note: "the \"brrrp\" of a motorola MDC-1200 data burst" },
];

export function rogerSteps(name: string): RogerStep[] {
  switch (name) {
    case "Classic":
      return [{ hz: 1000, ms: 90 }, { hz: 1500, ms: 90 }];
    case "Single":
      return [{ hz: 1200, ms: 120 }];
    case "Double":
      return [{ hz: 1600, ms: 60 }, { hz: 0, ms: 40 }, { hz: 1600, ms: 60 }];
    case "Chirp":
      return [{ hz: 1200, ms: 45 }, { hz: 1600, ms: 45 }, { hz: 2000, ms: 60 }];
    case "Bloop":
      return [{ hz: 1400, ms: 50 }, { hz: 900, ms: 50 }, { hz: 600, ms: 70 }];
    case "Morse K":
      return [
        { hz: 800, ms: 180 }, { hz: 0, ms: 60 }, { hz: 800, ms: 60 }, { hz: 0, ms: 60 }, { hz: 800, ms: 180 },
      ];
    case "Sweep": {
      const steps: RogerStep[] = [];
      for (let hz = 700; hz <= 2300; hz += 80) steps.push({ hz, ms: 10 });
      return steps;
    }
    case "Moto MDC": {
      // 1200 baud FSK, 1200 Hz for a 1 and 1800 Hz for a 0: bit sync, a sync
      // word, then a scrambled payload, the same bits as the firmware
      const steps: RogerStep[] = [];
      // The 40-bit sync word 0x07092a446f, in two parts
      const syncHi = 0x07;
      const syncLo = 0x092a446f;
      let lfsr = 0x1d872b41;
      for (let bit = 0; bit < 180; bit++) {
        let one: number;
        if (bit < 24) one = bit & 1;
        else if (bit < 64) {
          const shift = 63 - bit;
          one = shift >= 32 ? (syncHi >> (shift - 32)) & 1 : (syncLo >>> shift) & 1;
        }
        else {
          one = lfsr & 1;
          lfsr = ((lfsr >>> 1) ^ (one ? 0xa3000000 : 0)) >>> 0;
        }
        steps.push({ hz: one ? 1200 : 1800, ms: 1000 / 1200 });
      }
      return steps;
    }
    default:
      return [];
  }
}

/* Talk permit tones, as the firmware plays them (core/roger_beep.c) */
export const talkPermitStyles: { name: string; note: string }[] = [
  { name: "Beep", note: "one beep" },
  { name: "Double", note: "two quick beeps" },
  { name: "Motorola", note: "three fast high beeps, \"dit-dit-dit\"" },
  { name: "Moto clear", note: "the same, then one more: not encrypted" },
  { name: "Chime", note: "high, then low" },
];

export function talkPermitSteps(name: string): RogerStep[] {
  switch (name) {
    case "Beep":
      return [{ hz: 1000, ms: 100 }];
    case "Double":
      return [{ hz: 1400, ms: 50 }, { hz: 0, ms: 30 }, { hz: 1400, ms: 50 }];
    case "Motorola":
      return [
        { hz: 1800, ms: 30 }, { hz: 0, ms: 25 }, { hz: 1800, ms: 30 }, { hz: 0, ms: 25 }, { hz: 1800, ms: 30 },
      ];
    case "Moto clear":
      return [
        { hz: 1800, ms: 30 }, { hz: 0, ms: 25 }, { hz: 1800, ms: 30 }, { hz: 0, ms: 25 },
        { hz: 1800, ms: 30 }, { hz: 0, ms: 90 }, { hz: 1800, ms: 30 },
      ];
    case "Chime":
      return [{ hz: 1500, ms: 60 }, { hz: 1000, ms: 90 }];
    default:
      return [];
  }
}
