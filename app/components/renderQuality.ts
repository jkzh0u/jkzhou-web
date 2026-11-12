import type * as THREE from 'three';

// Rendering budget for the WebGL sections. The canvases are full-screen, so pixel count is the
// main cost: DPR 2 is 4x the pixels of DPR 1, and MSAA multiplies that again.

// Rough guess from hardware hints (deviceMemory is Chromium-only; undefined elsewhere).
export function isLowPowerDevice() {
    if (typeof navigator === 'undefined') return false;
    const nav = navigator as Navigator & {
        deviceMemory?: number;
        connection?: { saveData?: boolean };
    };
    const cores = nav.hardwareConcurrency ?? 8;
    const memory = nav.deviceMemory ?? 8;
    return cores <= 4 || memory <= 4 || nav.connection?.saveData === true;
}

export interface RenderQuality {
    pixelRatio: number;
    // MSAA only pays off on low-DPI screens; on retina it mostly costs fill rate
    antialias: boolean;
    anisotropy: number;
    lowPower: boolean;
}

export function getRenderQuality(isMobile: boolean): RenderQuality {
    const lowPower = isLowPowerDevice();
    const dpr = window.devicePixelRatio || 1;
    const cap = lowPower ? 1 : 1.5;
    const pixelRatio = Math.min(dpr, cap);
    return {
        pixelRatio,
        antialias: !lowPower && !isMobile && dpr < 1.5,
        anisotropy: lowPower ? 1 : 4,
        lowPower,
    };
}

// Watches frame times and steps the pixel ratio down while the page keeps missing frames.
// Only steps down (never back up), so quality can't oscillate. Call tick() once per frame
// the section is actually drawing.
export function createDprGovernor(
    renderers: THREE.WebGLRenderer[],
    resize: () => void,
    { min = 0.75, step = 0.25, slowMs = 24, warmupMs = 1500 } = {}
) {
    const startedAt = performance.now();
    let last = 0;
    let avg = 16.7;
    let slowFrames = 0;

    return {
        tick() {
            const now = performance.now();
            const dt = last ? now - last : 16.7;
            last = now;

            // ignore start-up work (texture uploads, shader compile) and one-off stalls such
            // as a background tab resuming; this is about the steady frame rate
            if (now - startedAt < warmupMs || dt > 250) return;

            avg += (dt - avg) * 0.1;
            slowFrames = avg > slowMs ? slowFrames + 1 : 0;

            if (slowFrames < 45) return;
            slowFrames = 0;

            const current = renderers[0]?.getPixelRatio() ?? 1;
            const next = Math.max(min, Math.round((current - step) * 100) / 100);
            if (next >= current) return;

            renderers.forEach((r) => r.setPixelRatio(next));
            resize();
            avg = 16.7;
        },
        // call when drawing pauses, so the gap isn't counted as a slow frame
        pause() {
            last = 0;
        },
    };
}
