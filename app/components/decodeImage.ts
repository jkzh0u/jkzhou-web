// Decodes an image off the main thread and downscales it, so loading full-resolution photos
// into WebGL never stutters an animation. Returns a canvas that can go straight into a
// THREE.CanvasTexture (which handles flipY correctly in every browser).
export async function decodeToCanvas(url: string, maxSide: number) {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob, {
        imageOrientation: 'from-image',
    });

    try {
        const w = bitmap.width;
        const h = bitmap.height;
        const scale = Math.min(1, maxSide / Math.max(w, h));
        const cw = Math.max(1, Math.round(w * scale));
        const ch = Math.max(1, Math.round(h * scale));

        let source: CanvasImageSource = bitmap;
        let resized: ImageBitmap | null = null;

        if (scale < 1) {
            try {
                resized = await createImageBitmap(bitmap, {
                    resizeWidth: cw,
                    resizeHeight: ch,
                    resizeQuality: 'high',
                });
                source = resized;
            } catch {
                /* drawImage below resizes instead */
            }
        }

        const c = document.createElement('canvas');
        c.width = cw;
        c.height = ch;

        const ctx = c.getContext('2d');
        if (!ctx) throw new Error('2d context unavailable');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(source, 0, 0, cw, ch);

        resized?.close();

        return { canvas: c, width: w, height: h };
    } finally {
        bitmap.close();
    }
}
