import gsap from 'gsap';

// "Lite mode": a fallback for machines that can't keep the page anywhere near smooth.
// It turns off the main-thread-heavy extras (smooth scroll, per-word scroll effects, the intro)
// so the page stays usable. It only switches on after sustained, very slow frames, and is
// remembered for the rest of the tab's session so later pages start in it.

const LITE_KEY = 'perf-lite';
const SLOW_FRAME_MS = 45; // ~22fps average
const SLOW_FRAMES_NEEDED = 40;
const WARMUP_MS = 3000;

let lite = false;
let started = false;
const listeners = new Set<() => void>();

try {
    if (typeof window !== 'undefined' && sessionStorage.getItem(LITE_KEY) === '1') {
        lite = true;
    }
} catch {
    /* storage unavailable */
}

export const isLiteMode = () => lite;

// Runs cb once lite mode turns on (immediately if it already is). Returns an unsubscribe.
export function onLiteMode(cb: () => void) {
    if (lite) {
        cb();
        return () => {};
    }
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}

function enterLiteMode() {
    if (lite) return;
    lite = true;
    document.documentElement.classList.add('perf-lite');
    try {
        sessionStorage.setItem(LITE_KEY, '1');
    } catch {
        /* storage unavailable */
    }
    listeners.forEach((cb) => cb());
    listeners.clear();
}

export function startPerfMonitor() {
    if (started || typeof window === 'undefined') return;
    started = true;

    if (lite) {
        document.documentElement.classList.add('perf-lite');
        return;
    }

    const t0 = performance.now();
    let last = 0;
    let avg = 16.7;
    let slow = 0;

    const tick = () => {
        const now = performance.now();
        const dt = last ? now - last : 16.7;
        last = now;

        // skip load-time work and background-tab pauses; this is about steady frame rate
        if (now - t0 < WARMUP_MS || dt > 500 || document.hidden) return;

        avg += (dt - avg) * 0.05;
        slow = avg > SLOW_FRAME_MS ? slow + 1 : 0;

        if (slow >= SLOW_FRAMES_NEEDED) {
            gsap.ticker.remove(tick);
            enterLiteMode();
        }
    };

    gsap.ticker.add(tick);
}
