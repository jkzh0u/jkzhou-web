// The homepage text's exit at the top of the screen, shared by AboutMe, SideQuests and Interests.
// Words come in from the bottom of the screen (each section's own reveal) and leave the same way
// at the top: as a word nears the navbar it fades and drifts up, gone just before it would sit
// under the navbar. Earlier words (a lower offset) go a touch sooner, so text leaves in reading
// order.

// px from the top of the screen where a word is fully gone
const EXIT_TOP = 34;
// the fade starts this far down the screen (fraction of the screen height)
const EXIT_START = 0.24;
// px a word drifts while it comes in or goes out
export const WORD_DRIFT = 22;

// 1 = fully shown, 0 = gone, for a word whose middle is screenY px from the top of the screen
export function wordExit(screenY: number, vh: number, offset = 0) {
    const t = (screenY - EXIT_TOP + offset) / (vh * EXIT_START - EXIT_TOP);
    return Math.max(0, Math.min(1, t));
}
