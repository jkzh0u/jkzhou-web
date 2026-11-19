// The C62 firmware's menus and settings, shown at /projects/c62/manual.
// Taken from the firmware's UI code (OpenRTX, c62/channels branch).
// In text, {name} is drawn as a key, e.g. {green} or {0}.

export type ManualBadge = "c62" | "saved" | "channel" | "empty";

export type ManualTable = {
  columns: string[];
  rows: string[][];
};

export type ManualScreen = {
  src: string;
  alt: string;
  caption: string;
};

export type ManualPage = {
  id: string;
  title: string;
  badges?: ManualBadge[];
  screens?: ManualScreen[];
  paragraphs?: string[];
  table?: ManualTable;
  /** Small print after the table */
  note?: string;
};

export type ManualSection = {
  id: string;
  heading: string;
  paragraphs?: string[];
  pages: ManualPage[];
};

const shot = (file: string, alt: string, caption: string): ManualScreen => ({
  src: `/projects/c62-manual/${file}.png`,
  alt,
  caption,
});

export const badgeLabels: Record<ManualBadge, string> = {
  c62: "c62 only",
  saved: "saved",
  channel: "per channel",
  empty: "empty",
};

export const badgeMeanings: Record<ManualBadge, string> = {
  c62: "added by my fork, not in other OpenRTX radios",
  saved: "written to flash 5 s after you change it",
  channel: "belongs to the frequency you're on, not the radio",
  empty: "there, but nothing in it on the C62",
};

export const manual: ManualSection[] = [
  {
    id: "keys",
    heading: "getting around",
    pages: [
      {
        id: "key-names",
        title: "keys",
        table: {
          columns: ["on the radio", "name", "in the menus"],
          rows: [
            ["{green} top left", "enter", "open the menu, open a page, start or finish changing a value"],
            ["{red} top right", "esc", "back one page, or cancel a change"],
            ["{up} {down} round key", "up / down", "move the selection, or change the value being edited"],
            ["{P1} {P2}", "F1 / F2", "not used by the menus"],
            ["{side} below the PTT", "side key", "held with a number: a shortcut"],
            ["{knob}", "power / volume", "wait 5 s after changing a setting before turning off"],
          ],
        },
      },
      {
        id: "changing",
        title: "changing a value",
        paragraphs: [
          "on every settings page: pick the line with {up} / {down}, press {green}, then {up} / {down} change it. {green} or {red} finishes. text like the callsign is typed on the number keys, like an old phone.",
          "on the main screen, {red} switches between VFO mode (a frequency) and memory mode (your channel list), and side key + {5} cycles FM, M17 and T (TETRA). a TETRA channel starts T mode by itself.",
        ],
      },
    ],
  },
  {
    id: "menu",
    heading: "the menu",
    paragraphs: [
      "{green} on the main screen opens it. the C62 has no GPS or clock, so the GPS and time pages other OpenRTX radios have are left out.",
    ],
    pages: [
      {
        id: "banks",
        title: "banks",
        badges: ["empty"],
        paragraphs: ["groups of channels. the channel list has no banks, so use memory mode or channels instead."],
      },
      {
        id: "channels",
        title: "channels",
        screens: [shot("menu-02-top-field-test", "the top menu with field test selected", "the menu")],
        paragraphs: [
          "every channel in your channel list, in order. {green} tunes to one, and each channel brings its own mode.",
          "the list isn't part of the firmware: you [write it as a text file](/projects/c62/channels), build it with chlist.py and [flash it](/projects/c62/flashing) next to the firmware. with no list, this page is empty and VFO mode still works.",
        ],
      },
      {
        id: "contacts",
        title: "contacts",
        badges: ["empty"],
        paragraphs: ["an address book for digital calls. TETRA talkgroups and radios get their names from the [channel list](/projects/c62/channels) instead."],
      },
      {
        id: "info",
        title: "info",
        screens: [shot("menu-10-info", "info page with version, battery, RSSI, heap and band", "info")],
        table: {
          columns: ["line", "shows"],
          rows: [
            ["top line", "the git commit the firmware was built from. -dirty means it had uncommitted changes"],
            ["bat. voltage", "battery voltage"],
            ["bat. charge", "estimated charge, in %"],
            ["RSSI", "signal strength on the current frequency, in dBm"],
            ["used heap", "memory in use, for bug reports"],
            ["band, VHF, UHF", "the bands the radio covers and their ranges"],
            ["hw version", "hardware revision"],
          ],
        },
      },
      {
        id: "field-test",
        title: "field test",
        badges: ["c62"],
        screens: [
          shot("15-field-test", "field test top: lock, signal and cell", "signal and cell"),
          shot("15a-field-test-middle", "field test middle: tracking, clock and neighbours", "tracking and neighbours"),
          shot("15b-field-test-end", "field test end: last measurement", "last measurement"),
        ],
        paragraphs: [
          "what the TETRA receiver knows right now, like the service screen on a real TETRA radio. {up} / {down} scroll, {green} searches for the best signal (same as holding {0}), {red} goes back.",
        ],
        table: {
          columns: ["part", "shows"],
          rows: [
            ["signal", "lock, phase error (10 to 20% is clean, decoding fails near 45%), dBm, carrier offset, resyncs, samples lost"],
            ["cell", "network (e.g. 302-2013 for the TTC), colour code, location area and its name, main carrier, load, air encryption"],
            ["tuned", "the frequency received if it isn't the main carrier, and the carrier of a call being followed"],
            ["tracking", "what cell tracking is doing: on the cell, checking neighbours, measuring, trying a carrier, waiting"],
            ["time", "the network's clock"],
            ["neighbours", "the cells this one broadcasts as neighbours, with their location areas"],
            ["measured", "the strongest carriers from the last search and their levels. the one being received is green with a *"],
          ],
        },
      },
    ],
  },
  {
    id: "settings",
    heading: "settings",
    paragraphs: [
      "seven pages. settings marked saved are written to flash 5 s after you last change one. per channel ones belong to the frequency you're on: they're saved with it, and a memory channel brings its own.",
    ],
    pages: [
      {
        id: "display",
        title: "display",
        badges: ["saved"],
        screens: [shot("menu-04-display", "display settings", "settings > display")],
        table: {
          columns: ["setting", "values", "starts at", "does"],
          rows: [
            ["brightness", "5 to 100, steps of 5", "100", "backlight level. also side key + {7} / {8}"],
            ["timer", "off, 5 s to 1 h", "30 s", "how long the screen stays lit after a key. a TETRA call keeps it on until it ends"],
            ["battery icon", "on / off", "off", "a battery icon in the top bar instead of the percentage"],
          ],
        },
      },
      {
        id: "radio",
        title: "radio",
        badges: ["channel"],
        screens: [shot("menu-05-radio", "radio settings", "settings > radio")],
        table: {
          columns: ["setting", "values", "starts at", "does"],
          rows: [
            ["offset", "typed", "0", "repeater offset between receive and transmit"],
            ["direction", "+ / -", "+", "whether transmit is above or below receive"],
            ["step", "1, 5, 6.25, 10, 12.5, 15, 20, 25, 50, 100 kHz", "12.5 kHz", "how far {up} / {down} move the frequency in VFO mode"],
          ],
        },
        note: "offset and direction only matter for transmitting. T mode and channel list channels are receive only.",
      },
      {
        id: "m17",
        title: "M17",
        badges: ["saved"],
        screens: [shot("menu-06-m17", "M17 settings", "settings > M17")],
        table: {
          columns: ["setting", "values", "starts at", "does"],
          rows: [
            ["callsign", "up to 9 characters", "N0CALL", "your callsign, sent in M17 transmissions"],
            ["meta txt", "text", "OpenRTX", "a short text sent with transmissions. 7 characters show, then a *"],
            ["CAN", "0 to 15", "0", "channel access number, M17's version of a tone"],
            ["CAN RX check", "on / off", "off", "only play transmissions with the same CAN"],
          ],
        },
      },
      {
        id: "fm",
        title: "FM",
        badges: ["channel"],
        screens: [shot("menu-07-fm", "FM settings", "settings > FM")],
        table: {
          columns: ["setting", "values", "starts at", "does"],
          rows: [
            ["CTCSS tone", "67.0 to 254.1 Hz", "67.0", "the sub-audible tone. also side key + {2} / {3}"],
            ["CTCSS en.", "N none, T encode, R decode, B both", "N", "decode only opens the speaker for signals with the tone. also side key + {1}"],
          ],
        },
        note: "FM bandwidth isn't on this page: side key + {4} switches 12.5 and 25 kHz.",
      },
      {
        id: "tetra",
        title: "TETRA",
        badges: ["c62", "saved"],
        screens: [shot("menu-08b-tetra", "TETRA settings, all five on", "settings > TETRA")],
        table: {
          columns: ["setting", "on (default)", "off"],
          rows: [
            ["follow calls", "retunes to whichever carrier the network moves a call to, then comes back", "stays on the main carrier: calls elsewhere show but aren't heard"],
            ["cell tracking", "moves to a stronger cell when the signal gets weak, searches when it's lost", "stays on the channel you picked. holding {0} still searches once"],
            ["alarm beep", "an alarm talkgroup call turns the screen red and beeps three times", "red screen only"],
            ["keep filter", "starts with the talkgroup filter you last picked", "starts at TG All"],
            ["freq. correct", "tunes itself so the signal decodes best: the C62 decodes best about 1.6 kHz off the channel frequency, plus its crystal error. found within about 20 s, kept across channel changes, reset if nothing decodes for 8 s", "tunes exactly to the channel frequency"],
          ],
        },
        note: "here {up} turns a setting on and {down} turns it off. keep filter remembers the filter, not a held talkgroup. alarm talkgroups are the ones marked TF_ALARM in the channel list.",
      },
      {
        id: "accessibility",
        title: "accessibility",
        badges: ["saved"],
        screens: [shot("menu-08-accessibility", "accessibility settings", "settings > accessibility")],
        table: {
          columns: ["setting", "values", "starts at", "does"],
          rows: [
            ["macro latch", "on / off", "on", "holding the side key on its own latches shortcut mode until you press it again"],
            ["voice", "off, beep, 1 to 3", "off", "spoken prompts for menus and values. not tried on the C62 yet"],
            ["phonetic", "on / off", "off", "spell letters as alpha, bravo in voice prompts"],
          ],
        },
      },
      {
        id: "defaults",
        title: "default settings",
        screens: [shot("menu-09-reset", "reset to defaults confirmation", "settings > default settings")],
        paragraphs: [
          "puts every setting back, including the TETRA ones, and the VFO back to 430.000 MHz in M17. press {green} once to arm it and again to reset. {red} cancels. your channel list isn't touched.",
        ],
      },
    ],
  },
  {
    id: "shortcuts",
    heading: "shortcuts",
    paragraphs: [
      "hold the side key and press a number. in memory mode, holding the number on its own does the same.",
    ],
    pages: [
      {
        id: "side-key",
        title: "side key +",
        screens: [shot("menu-12-shortcuts", "the shortcut overlay", "while the side key is held")],
        table: {
          columns: ["key", "does"],
          rows: [
            ["{1}", "FM: tone off, encode, decode, both"],
            ["{2} {3}", "FM: tone down / up"],
            ["{4}", "FM: bandwidth 12.5 or 25 kHz"],
            ["{5}", "mode: FM, M17, T"],
            ["{6}", "transmit power"],
            ["{7} {8}", "brightness down / up"],
            ["{9}", "lock or unlock the keypad"],
            ["{0}", "send the TETRA log the radio kept over the cable"],
          ],
        },
      },
      {
        id: "t-mode",
        title: "in T mode",
        table: {
          columns: ["key", "press", "hold"],
          rows: [
            ["{#}", "next talkgroup filter", "hold the current call's talkgroup"],
            ["{*}", "previous talkgroup filter", "switch line 1 between the last call and signal figures"],
            ["{0}", "recent calls", "search for the best signal"],
          ],
        },
      },
    ],
  },
  {
    id: "saving",
    heading: "what's saved",
    paragraphs: [
      "settings are written to flash 5 s after your last change, and only what changed. the C62 notices power off too late to write safely, so it doesn't wait for it: turning off within 5 s of a change loses that change.",
    ],
    pages: [
      {
        id: "kept",
        title: "after power off",
        table: {
          columns: ["what", "kept?"],
          rows: [
            ["menu settings", "yes"],
            ["frequency and mode", "yes, in VFO mode, so a TETRA cell starts receiving again by itself"],
            ["talkgroup filter", "yes, with keep filter on"],
            ["held talkgroup", "no"],
            ["memory mode and channel number", "not yet"],
            ["recent calls and the log", "no. send the log with side key + {0} first"],
            ["channel list", "always: it's flashed separately and the radio never writes to it"],
          ],
        },
      },
    ],
  },
];
