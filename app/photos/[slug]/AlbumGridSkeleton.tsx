

const css = `
  .al-skel {
    position: relative;
    overflow: hidden;
    background: color-mix(in srgb, currentColor 6%, transparent);
  }

  .al-skel::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      100deg,
      transparent 20%,
      color-mix(in srgb, currentColor 8%, transparent) 50%,
      transparent 80%
    );
    background-size: 220% 100%;
    animation: al-shimmer 1.4s linear infinite;
  }

  .al-wrap {
    animation: al-in 0.4s ease both;
  }

  @keyframes al-shimmer {
    from { background-position: 120% 0; }
    to { background-position: -120% 0; }
  }

  @keyframes al-in {
    from { opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .al-skel::after,
    .al-wrap {
      animation: none;
    }
  }
`;

const COLUMNS = [
  ["3 / 2", "2 / 3", "3 / 2"],
  ["2 / 3", "3 / 2", "3 / 2"],
  ["3 / 2", "3 / 2", "2 / 3"],
];

export default function AlbumGridSkeleton() {
  return (
    <div className="al-wrap" aria-busy="true">
      <style>{css}</style>
      <span className="sr-only">loading photos</span>
      <div className="flex items-start gap-5">
        {COLUMNS.map((col, c) => (
          <div
            key={c}
            className={`min-w-0 flex-1 flex-col gap-5 ${c === 2 ? "hidden sm:flex" : "flex"}`}
          >
            {col.map((ratio, i) => (
              <div key={i} className="al-skel w-full" style={{ aspectRatio: ratio }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
