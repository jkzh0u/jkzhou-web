// A working copy of ABCanto from abcanto.jkzhou.ca/embed, shown on its project page so
// people can try a search without leaving. Dark theme by default; results scroll inside
// the frame.

const EMBED_URL = "https://abcanto.jkzhou.ca/embed?theme=dark";

export default function AbcantoWidget() {
  return (
    <>
      {/* Shows until the frame has loaded, and if abcanto is down */}
      <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400" aria-hidden="true">
        loading ABCanto...
      </div>
      <iframe
        src={EMBED_URL}
        title="try ABCanto: find the cantonese word"
        loading="lazy"
        className="relative size-full border-0"
      />
    </>
  );
}
