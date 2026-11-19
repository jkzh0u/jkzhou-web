// How to write a channel list for the C62 firmware and put it on the radio, shown at
// /projects/c62/channels. Taken from the firmware's channel list guide (OpenRTX, c62/channels branch).
// Same shape as the flashing page, so it uses the same guide.

import type { FlashSection } from "./c62Flashing";

export const channelsIntro =
  "the firmware has no channels in it. memory mode channels, TETRA talkgroup names and filters all come from a list you write and flash on its own.";

export const channelsNote =
  "none of this has been tried on a radio yet, since mine hasn't arrived.";

export const channelsSections: FlashSection[] = [
  {
    id: "writing",
    heading: "writing your list",
    steps: [
      {
        id: "copy",
        title: "1. copy the example list",
        blocks: [
          { type: "p", text: "from the workspace folder (the one that holds `OpenRTX`):" },
          { type: "code", code: "cp OpenRTX/scripts/c62/channels/example.h my_channels.h" },
          {
            type: "p",
            text: "`ttc_tetra.h` is a full real list for Toronto, if you'd like a bigger example.",
          },
        ],
      },
      {
        id: "add",
        title: "2. add your channels",
        blocks: [
          {
            type: "p",
            text: "open `my_channels.h` and write one line per channel, in the order memory mode should step through them:",
          },
          {
            type: "code",
            code: `CPS_CHANNEL("NOAA WX 1", 162550000, OPMODE_FM)
CPS_CHANNEL("M17 Simplex", 433475000, OPMODE_M17)
CPS_CHANNEL("TETRA Site 1", 390012500, OPMODE_TETRA)`,
          },
          {
            type: "list",
            items: [
              "name: plain ASCII. the main screen shows 12 characters.",
              "frequency: in Hz, so 390.0125 MHz is `390012500`.",
              "mode: `OPMODE_FM`, `OPMODE_M17` or `OPMODE_TETRA`. a TETRA channel starts T mode by itself.",
            ],
          },
          { type: "p", text: "channels are receive only. delete the example lines you don't want." },
        ],
      },
      {
        id: "talkgroups",
        title: "3. optional: name TETRA talkgroups",
        blocks: [
          {
            type: "p",
            text: "talkgroups and radios you don't name show as numbers. a line gives an SSI (the decimal ID), the name to show, and which filters it belongs to (the next step), or `0` for none:",
          },
          {
            type: "code",
            code: `TETRA_ID(1001, "Dispatch", 0)               // SSI, name (16 chars), filters
TETRA_ID(9999, "Emergency", TF_EVERY | TF_ALARM)
TETRA_ID_RANGE(500001, 500999, "Unit %u", 500000, 0)  // 500123 -> "Unit 123"
TETRA_LA(1, "Downtown")                     // location area name`,
          },
          {
            type: "list",
            items: [
              "names: up to 16 characters. a range names a whole block of radios at once: the name has one `%u`, which gets the SSI minus the base, so 500123 shows as `Unit 123`.",
              "location areas: `TETRA_LA` names one. until you do, the cell screen shows `LA <n>`.",
              "alarms: `TF_ALARM` makes a talkgroup's calls turn the screen red and beep.",
            ],
          },
        ],
      },
      {
        id: "filters",
        title: "4. optional: only hear some talkgroups",
        blocks: [
          {
            type: "p",
            text: "a TETRA cell carries many talkgroups, and you often only care about a few. a filter is a named set of talkgroups. you define filters, say which ones each talkgroup belongs to, and then pick a filter on the radio to hear only those calls.",
          },
          {
            type: "code",
            code: `TETRA_FILTER(OPS, "Operations")
TETRA_FILTER(MAINT, "Maintenance")

TETRA_ID(1001, "Dispatch", TF(OPS))
TETRA_ID(1002, "Yard", TF(OPS) | TF(MAINT))
TETRA_ID(2001, "Maint Crew", TF(MAINT))
TETRA_ID(9999, "Emergency", TF_EVERY | TF_ALARM)`,
          },
          {
            type: "list",
            items: [
              "`TETRA_FILTER` defines a filter: a short id, then the name shown on the radio. up to 30. they come after `TG All`, in the order you write them.",
              "in each `TETRA_ID`, `TF(...)` says which filters it's in. join several with `|`. `TF_EVERY` puts it in every filter, so it always comes through, and `0` puts it in none.",
              "a range can be filtered too: `TETRA_ID_RANGE(500001, 500999, \"Unit %u\", 500000, TF(OPS))`.",
            ],
          },
          {
            type: "p",
            text: "on the radio, in T mode, press # for the next filter and * for the previous one. the top bar shows the one you're on: `TG All` in white lets every call through, and any other filter shows in yellow. a call gets through when its talkgroup is in the filter, or for a call between two radios, when either radio is. its voice, the call screen and call following all go with it, and everything else is ignored.",
          },
          {
            type: "p",
            text: "to hear just one talkgroup without a filter, hold # during a call. it holds that call's talkgroup, or the last one heard, and only its calls come through. press # or * again to release it. the filter starts at `TG All` after every power on.",
          },
        ],
      },
    ],
  },
  {
    id: "installing",
    heading: "getting it on the radio",
    steps: [
      {
        id: "build",
        title: "5. build the image and check it",
        blocks: [
          {
            type: "code",
            code: `python3 OpenRTX/scripts/chlist.py my_channels.h -o channels.bin
python3 OpenRTX/scripts/chlist.py --show channels.bin`,
          },
          {
            type: "p",
            text: "the script needs only Python 3. if a line is wrong, it stops and gives the line number. `--show` lists what the image holds, so check your channels are all there.",
          },
          {
            type: "p",
            text: "if you'd rather build the list with the firmware, add `-DC62_CHANNELS=../my_channels.h` to the docker build command. the path is relative to the `OpenRTX` folder. the image then comes out as `OpenRTX/build_c62/zephyr/channels.bin`.",
          },
        ],
      },
      {
        id: "flash",
        title: "6. flash it",
        blocks: [
          {
            type: "p",
            text: "put the radio in burn mode: turn it off, hold the lower side key, turn it on, then let go. the screen stays dark. run this with your cable's port in place of `PORT`:",
          },
          {
            type: "code",
            code: "cskburn -s PORT -C 6 -b 115200 -v --verify-all 0x2c0000 channels.bin",
          },
          {
            type: "p",
            text: "finding the port and installing cskburn on your system are steps 1 and 2 of the [flashing instructions](/projects/c62/flashing), which also cover Windows.",
          },
          {
            type: "note",
            text: "this writes only the channel list: your firmware, saved settings and the radio's calibration aren't touched.",
          },
        ],
      },
    ],
  },
  {
    id: "using",
    heading: "using your channels",
    steps: [
      {
        id: "on-radio",
        title: "7. use them on the radio",
        blocks: [
          {
            type: "list",
            items: [
              "memory mode: press red to switch from VFO to memory mode, then up / down to step through your channels. to jump to one, type its number: it jumps after 2 s, or straight away with green.",
              "from the menu: green, then Channels, lists them all. the [manual](/projects/c62/manual#channels) has that page, and the rest of the menu.",
            ],
          },
          {
            type: "p",
            text: "if you have the log running (`c62_log.py`), the radio prints `Channel list: N channels, N TETRA names` at power on. `none flashed` means it found no list at that address. `not used, damaged or other version` means rebuild the image with this firmware's `chlist.py` and flash it again.",
          },
          {
            type: "p",
            text: "to change channels later, edit `my_channels.h`, then repeat steps 5 and 6. your settings are kept.",
          },
        ],
      },
    ],
  },
];
