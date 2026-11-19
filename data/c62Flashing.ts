// How to flash the C62 firmware, shown at /projects/c62/flashing.
// Taken from the firmware's FLASHING.md (OpenRTX, c62/channels branch).
// In text, `code` is monospace and [label](url) is a link.

export type OS = "macos" | "linux" | "windows";

export const osLabels: Record<OS, string> = {
  macos: "macOS",
  linux: "Linux",
  windows: "Windows",
};

type Shown = {
  /** Only shown for these systems. Left out, it is shown for all of them */
  os?: OS[];
};

export type FlashBlock = Shown &
  (
    | { type: "p"; text: string }
    | { type: "heading"; text: string }
    | { type: "list"; items: string[]; ordered?: boolean }
    | { type: "code"; code: string }
    | { type: "table"; columns: string[]; rows: string[][] }
    | { type: "note"; text: string }
  );

export type FlashStep = {
  id: string;
  title: string;
  blocks: FlashBlock[];
};

const RELEASES = "https://github.com/LISTENAI/cskburn/releases";
const FIRST_FLASH = "https://github.com/jkzh0u/OpenRTX/blob/c62/channels/scripts/c62/FIRST_FLASH.md";

export const flashingIntro =
  "step by step, for macOS, Linux and Windows. it takes about 15 minutes the first time.";

export const flashingNote = `this firmware hasn't been run on a C62 yet. for a first flash, follow this page to set up and make the backup, then the [first flash checklist](${FIRST_FLASH}), which turns the features on in stages. you flash a channel list with the firmware, so make one first: see [channel lists](/projects/c62/channels).`;

export const flashing: FlashStep[] = [
  {
    id: "need",
    title: "what you need",
    blocks: [
      {
        type: "list",
        items: [
          "a USB programming cable with a 2-pin Kenwood plug, the kind sold for Baofeng and Retevis radios. which cables work with the C62 isn't known yet: if yours does or doesn't, note its make and chip.",
          "the firmware files. build them with docker (see the [project page](/projects/c62)). they end up in `OpenRTX/build_c62/zephyr/`.",
          "your channel list, `channels.bin`. the firmware has no channels in it, so this is part of the install, not an extra: see [channel lists](/projects/c62/channels) for how to make one.",
          "cskburn, the flashing tool for the radio's chip. step 1 installs it.",
          "about 5 MB of space for the backup, and somewhere to keep a copy of it other than your computer.",
        ],
      },
      {
        type: "table",
        columns: ["file", "what it is", "flash at"],
        rows: [
          ["`zephyr.bin`", "the firmware", "`0x000000`"],
          ["`dsp_firmware.bin`", "the DSP core's firmware, downloaded by the build", "`0x100000`"],
          ["`channels.bin`", "your [channel list](/projects/c62/channels): memory channels, and names for TETRA talkgroups", "`0x2c0000`"],
        ],
      },
    ],
  },
  {
    id: "channel-list",
    title: "your channel list",
    blocks: [
      {
        type: "p",
        text: "the firmware holds no channels, so the radio gets them from a list that's flashed on its own at `0x2c0000`. without one it has no memory channels and shows TETRA numbers instead of names. everything else still works, but you'd be flashing a radio you can't really use yet.",
      },
      {
        type: "p",
        text: "so make your list before you flash. you write it as a text file, one line per channel, and a python script turns it into `channels.bin`. [channel lists](/projects/c62/channels) has the steps, and a full list for Toronto to start from. it takes a few minutes.",
      },
    ],
  },
  {
    id: "install",
    title: "1. install cskburn",
    blocks: [
      { type: "p", os: ["macos"], text: "with [Homebrew](https://brew.sh):" },
      { type: "code", os: ["macos"], code: "brew install listenai/tap/cskburn\ncskburn --version" },
      {
        type: "p",
        os: ["macos"],
        text: `without Homebrew, download \`cskburn-darwin-arm64.tar.xz\` (Apple silicon) or \`cskburn-darwin-x64.tar.xz\` (Intel) from the [releases](${RELEASES}), then:`,
      },
      {
        type: "code",
        os: ["macos"],
        code: `cd ~/Downloads
tar -xf cskburn-darwin-arm64.tar.xz
xattr -d com.apple.quarantine cskburn   # else macOS refuses to run it
sudo mv cskburn /usr/local/bin/
cskburn --version`,
      },
      {
        type: "p",
        os: ["linux"],
        text: `download \`cskburn-linux-x64.tar.xz\` from the [releases](${RELEASES}) (\`cskburn-linux-arm64.tar.xz\` on a Raspberry Pi 4 or 5 with a 64-bit system), then:`,
      },
      {
        type: "code",
        os: ["linux"],
        code: `cd ~/Downloads
tar -xf cskburn-linux-x64.tar.xz
sudo install cskburn /usr/local/bin/
cskburn --version`,
      },
      { type: "p", os: ["linux"], text: "let your user open serial ports, then log out and back in:" },
      {
        type: "code",
        os: ["linux"],
        code: `sudo usermod -aG dialout "$USER"   # Debian, Ubuntu, Fedora
sudo usermod -aG uucp "$USER"      # Arch`,
      },
      {
        type: "list",
        ordered: true,
        os: ["windows"],
        items: [
          `download \`cskburn-win32-x64.zip\` from the [releases](${RELEASES}).`,
          "make a folder `C:\\c62` and unzip `cskburn.exe` into it.",
          "open PowerShell, then run the commands below.",
        ],
      },
      { type: "code", os: ["windows"], code: "cd C:\\c62\n.\\cskburn.exe --version" },
      {
        type: "p",
        os: ["windows"],
        text: "the commands after this are run from `C:\\c62`, with the firmware files copied there (step 5).",
      },
    ],
  },
  {
    id: "port",
    title: "2. find the cable's port",
    blocks: [
      { type: "p", text: "plug the cable into the computer, not into the radio yet." },
      {
        type: "p",
        os: ["macos"],
        text: "run this once without the cable and once with it. the new name is the cable, such as `/dev/cu.usbserial-A10KXYZ` or `/dev/cu.wchusbserial1410`. use the `cu.` name, not the `tty.` one.",
      },
      { type: "code", os: ["macos"], code: "ls /dev/cu.*" },
      {
        type: "p",
        os: ["linux"],
        text: "it's usually `/dev/ttyUSB0`. if nothing appears, `sudo dmesg | tail` shows what happened when the cable was plugged in. on Ubuntu, if the cable is found and then lost again, the `brltty` package (braille displays) took it: `sudo apt remove brltty` and plug it in again.",
      },
      { type: "code", os: ["linux"], code: "ls /dev/ttyUSB* /dev/ttyACM*" },
      {
        type: "p",
        os: ["windows"],
        text: "open Device Manager (right-click the Start button) and expand Ports (COM & LPT). the cable shows as `USB Serial Port (COM3)` or similar: note the COM number. if it shows under Other devices with a warning sign, its driver is missing. the cable seller's page, or the chip maker (FTDI, WCH for CH340, Silicon Labs for CP210x, Prolific), has it.",
      },
      { type: "note", text: "from here on, use your port name where the commands say `PORT`." },
    ],
  },
  {
    id: "burn-mode",
    title: "3. enter burn mode",
    blocks: [
      {
        type: "p",
        text: "every cskburn command needs the radio in burn mode, and the radio leaves it after each command, so you do this before each command:",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "turn the radio off with the knob.",
          "plug the cable into the radio's Kenwood jack, all the way in.",
          "hold the lower side key.",
          "turn the radio on, keep holding for a second, then let go.",
          "the screen stays dark. that's burn mode.",
        ],
      },
      {
        type: "note",
        text: "never press the PTT while the cable is in: it shares a line with the chip's boot loader and breaks the transfer.",
      },
    ],
  },
  {
    id: "backup",
    title: "4. back up the radio",
    blocks: [
      {
        type: "p",
        text: "do this before flashing anything. the radio's flash holds calibration made for this unit only, and the backup is the only way back to the stock firmware. it reads the whole 4 MB, which takes a few minutes.",
      },
      { type: "code", os: ["macos", "linux"], code: "cskburn -s PORT -C 6 -b 115200 -v --read 0x0:0x400000:backup.bin" },
      { type: "code", os: ["windows"], code: ".\\cskburn.exe -s PORT -C 6 -b 115200 -v --read 0x0:0x400000:backup.bin" },
      { type: "p", text: "when it ends, `backup.bin` should be exactly 4,194,304 bytes:" },
      { type: "code", os: ["macos", "linux"], code: "ls -l backup.bin" },
      { type: "code", os: ["windows"], code: "(Get-Item backup.bin).Length" },
      {
        type: "note",
        text: "copy backup.bin somewhere else now: a USB stick, cloud storage, an email to yourself. keep it for as long as you own the radio.",
      },
    ],
  },
  {
    id: "flash",
    title: "5. flash the firmware",
    blocks: [
      {
        type: "p",
        os: ["windows"],
        text: "docker builds the firmware inside WSL, but flashing is easier from Windows itself, which sees the cable without extra setup. copy the files to `C:\\c62`, from the WSL shell in the workspace folder (leave out `channels` if you didn't build a list):",
      },
      {
        type: "code",
        os: ["windows"],
        code: "cp OpenRTX/build_c62/zephyr/{zephyr,dsp_firmware,channels}.bin /mnt/c/c62/",
      },
      { type: "p", text: "burn mode again (step 3), then flash all three files together, the channel list included:" },
      {
        type: "code",
        os: ["macos", "linux"],
        code: `cskburn -s PORT -C 6 -b 115200 -v --verify-all \\
    0x100000 OpenRTX/build_c62/zephyr/dsp_firmware.bin \\
    0x2c0000 OpenRTX/build_c62/zephyr/channels.bin \\
    0x000000 OpenRTX/build_c62/zephyr/zephyr.bin`,
      },
      {
        type: "code",
        os: ["windows"],
        code: `.\\cskburn.exe -s PORT -C 6 -b 115200 -v --verify-all \`
    0x100000 dsp_firmware.bin \`
    0x2c0000 channels.bin \`
    0x000000 zephyr.bin`,
      },
      {
        type: "p",
        text: "the `0x2c0000` line is your [channel list](/projects/c62/channels). `--verify-all` reads everything back and stops with an error if any of it differs. at the end the radio restarts into the new firmware.",
      },
      {
        type: "p",
        text: "for later updates, a new firmware only needs the `0x000000` line, and a new channel list only the `0x2c0000` line. the DSP firmware only changes when the build says it downloaded a new one.",
      },
    ],
  },
  {
    id: "check",
    title: "6. check that it runs",
    blocks: [
      {
        type: "p",
        text: "the firmware writes a log on the same cable at 115200 baud. with Python 3 and `pip install pyserial`:",
      },
      { type: "code", os: ["macos", "linux"], code: "python3 OpenRTX/scripts/c62_log.py -p PORT -o first.log" },
      { type: "code", os: ["windows"], code: "python OpenRTX\\scripts\\c62_log.py -p PORT -o first.log" },
      {
        type: "p",
        os: ["windows"],
        text: "if the OpenRTX folder is only inside WSL, copy `c62_log.py` next to the other files and run it as `python c62_log.py ...`.",
      },
      {
        type: "p",
        text: `turn the radio off and on without holding the side key. you should see the startup lines, \`Channel list: N channels, N TETRA names\` with the numbers your list should have, and \`TETRA log, 256 kB kept\`. the screen shows the main screen. then carry on with the [first flash checklist](${FIRST_FLASH}). the [manual](/projects/c62/manual) has every menu and setting on the radio.`,
      },
    ],
  },
  {
    id: "stock",
    title: "restore your backup",
    blocks: [
      {
        type: "p",
        text: "burn mode, then flash the backup over the whole flash. this also removes the channel list and the saved settings.",
      },
      { type: "code", os: ["macos", "linux"], code: "cskburn -s PORT -C 6 -b 115200 -v --verify-all 0x000000 backup.bin" },
      { type: "code", os: ["windows"], code: ".\\cskburn.exe -s PORT -C 6 -b 115200 -v --verify-all 0x000000 backup.bin" },
    ],
  },
  {
    id: "trouble",
    title: "common problems",
    blocks: [
      {
        type: "table",
        columns: ["what you see", "try"],
        rows: [
          [
            "cskburn waits, then times out",
            "the radio isn't in burn mode or the plug isn't all the way in. turn it off and do step 3 again. press the plug in firmly: Kenwood plugs often need a push past a first click.",
          ],
          ["permission denied on the port (Linux)", "the `dialout` / `uucp` step in step 1, then log out and back in."],
          ["the port is busy", "something else has it open: close `c62_log.py`, serial terminals, CPS software."],
          [
            "macOS says cskburn \"cannot be opened\"",
            "`xattr -d com.apple.quarantine /usr/local/bin/cskburn`, or install with Homebrew.",
          ],
          ["no COM port on Windows", "the cable's driver (step 2), or try another USB port."],
          [
            "it connects, then fails before writing",
            "note the exact error and the cable's make and chip, and try once more. another cable may be needed.",
          ],
          [
            "`--verify-all` reports a mismatch",
            "flash again. if it repeats at the same address, stop and keep the output.",
          ],
          [
            "`Channel list: none flashed` in the log",
            "nothing valid was found at `0x2c0000`. flash `channels.bin` there, in burn mode: see [channel lists](/projects/c62/channels).",
          ],
          [
            "`Channel list: not used, damaged or other version`",
            "the image was cut short or made by another version of `chlist.py`. build it again with the `chlist.py` of this firmware and flash it again.",
          ],
          [
            "no memory channels, and TETRA numbers instead of names",
            "the radio has no channel list. make and flash one: [channel lists](/projects/c62/channels).",
          ],
          [
            "the radio doesn't start after flashing",
            "flash again. if it still doesn't start, flash `backup.bin` to get the stock firmware back.",
          ],
        ],
      },
      {
        type: "p",
        text: "keep the full output of any failed command: run it again with `2>&1 | tee flash.log` on macOS and Linux, or `*> flash.log` in PowerShell.",
      },
    ],
  },
];

export type FlashSection = {
  id: string;
  heading: string;
  steps: FlashStep[];
};

const steps = (...ids: string[]) =>
  ids.map((id) => {
    const step = flashing.find((s) => s.id === id);
    if (!step) throw new Error(`no flashing step ${id}`);
    return step;
  });

/** The steps in groups, the way the manual groups its pages */
export const flashingSections: FlashSection[] = [
  { id: "getting-ready", heading: "getting ready", steps: steps("need", "install", "port") },
  { id: "flashing", heading: "flashing", steps: steps("burn-mode", "backup", "flash", "check") },
  { id: "stock-firmware", heading: "going back to the stock firmware", steps: steps("stock") },
  { id: "troubleshooting", heading: "troubleshooting", steps: steps("trouble") },
];
