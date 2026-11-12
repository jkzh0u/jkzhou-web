"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

type Status = "idle" | "submitting" | "leaving" | "sent" | "error";

const EMAIL = "hello@jkzhou.ca";

const CHANNELS = [
  { label: "email", value: EMAIL, href: `mailto:${EMAIL}`, external: false },
  {
    label: "instagram",
    value: "@jkzhouu",
    href: "https://www.instagram.com/jkzhouu/",
    external: true,
  },
  {
    label: "linkedin",
    value: "jackson zhou",
    href: "https://www.linkedin.com/in/jackson-zhou-9a5703297/",
    external: true,
  },
];

const TITLE_LINES = ["let's make", "something cool."];

const PHOTOS = [
  { src: "https://assets.jkzhou.ca/homepage/hiking.jpg", alt: "jackson with a camera and friends by the river" },
  { src: "https://assets.jkzhou.ca/homepage/aquarium.jpg", alt: "a silhouette in front of a kelp tank at the aquarium" },
  { src: "https://assets.jkzhou.ca/homepage/bluecntower.jpg", alt: "someone looking up at the cn tower" },
];

function ContactPhoto({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span className={`ct-photo${loaded ? " is-loaded" : ""}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1000px) 15vw, 33vw"
        loading="eager"
        className="object-cover"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </span>
  );
}

const delay = (s: number) => ({ animationDelay: `${s}s` });

function Dart() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 12 2.5 3.5 7 12l-4.5 8.5Z" />
      <path d="M7 12h15" />
    </svg>
  );
}

const FLIGHT_MS = 9000;

function Sky() {
  const laneRef = useRef<HTMLSpanElement>(null);
  const planeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const lane = laneRef.current;
    const plane = planeRef.current;
    if (!lane || !plane || typeof plane.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let anim: Animation | null = null;

    const build = () => {
      const size = plane.offsetWidth || 20;
      const laneH = lane.clientHeight;
      const W = Math.max(60, Math.min(lane.clientWidth - size, 170));
      const A = Math.max(6, Math.min(20, laneH / 2 - size / 2));
      const cy = laneH / 2 - size / 2;

      const N = 360;
      const pts: [number, number][] = [];
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * Math.PI * 2;
        pts.push([((Math.sin(t) + 1) / 2) * W, cy + A * Math.sin(2 * t)]);
      }

      const len = [0];
      for (let i = 1; i <= N; i++) {
        len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      }
      const total = len[N];

      const K = 120;
      const frames: Keyframe[] = [];
      let j = 0;
      let prev: number | null = null;
      let heading = 0;

      for (let k = 0; k <= K; k++) {
        const target = (k / K) * total;
        while (j < N - 1 && len[j + 1] < target) j++;
        const f = (target - len[j]) / (len[j + 1] - len[j] || 1);
        const x = pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f;
        const y = pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f;

        const a = pts[(j - 3 + N) % N];
        const b = pts[(j + 4) % N];
        const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
        if (prev === null) heading = ang;
        else {
          let d = ang - prev;
          while (d > 180) d -= 360;
          while (d < -180) d += 360;
          heading += d;
        }
        prev = ang;

        frames.push({
          transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${heading.toFixed(1)}deg)`,
          offset: k / K,
        });
      }

      const at = anim ? Number(anim.currentTime ?? 0) % FLIGHT_MS : 0;
      anim?.cancel();
      anim = plane.animate(frames, { duration: FLIGHT_MS, iterations: Infinity, easing: "linear" });
      anim.currentTime = at;
    };

    const ro = new ResizeObserver(build);
    ro.observe(lane);

    return () => {
      ro.disconnect();
      anim?.cancel();
    };
  }, []);

  return (
    <span ref={laneRef} className="ct-sky" aria-hidden="true">
      <span ref={planeRef} className="ct-plane">
        <Dart />
      </span>
    </span>
  );
}

export default function ContactSection() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const leaveTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const subject = String(data.get("subject") || "").trim();
    const message = String(data.get("message") || "").trim();

    if (!name || !email || !subject || !message) {
      setError("fill in your name, email, a subject, and a message before sending.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("that email doesn't look right, double check it.");
      return;
    }

    setStatus("submitting");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
        }),
      });

      if (!res.ok) throw new Error("request failed");

      setStatus("leaving");
      leaveTimer.current = window.setTimeout(() => {
        form.reset();
        setStatus("sent");
      }, 450);
    } catch {
      setStatus("error");
      setError(
        `something went wrong on my end. try again, or just email me at ${EMAIL}.`
      );
    }
  }

  const sent = status === "sent";
  const submitting = status === "submitting" || status === "leaving";

  return (
    <section className="ct-root">
      <style>{css}</style>
      <h1 className="ct-title">
        {TITLE_LINES.map((line, i) => (
          <span key={line} className="ct-mask">
            <span className="ct-line" style={delay(0.15 + i * 0.1)}>
              {line}
            </span>
          </span>
        ))}
      </h1>
      <div className="ct-body">
        <div className="ct-left">
          <p className="ct-intro ct-fade" style={delay(0.45)}>
            got an idea, a shoot, a project or a collab? send a message and
            i&apos;ll get back to you as soon as i can.
          </p>
          <ul className="ct-rows ct-fade" style={delay(0.55)}>
            {CHANNELS.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  className="ct-row"
                  {...(c.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  <span className="ct-row-label">{c.label}</span>
                  <span className="ct-row-value">{c.value}</span>
                  <ArrowUpRight className="ct-row-arrow" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
          <div className="ct-photos ct-fade" style={delay(0.7)}>
            {PHOTOS.map((photo) => (
              <ContactPhoto key={photo.src} {...photo} />
            ))}
          </div>
        </div>
        <div className="ct-right ct-fade" style={delay(0.65)} aria-live="polite">
          {sent ? (
            <div className="ct-sent">
              <p className="ct-sent-title">message sent.</p>
              <p className="ct-sent-sub">
                thanks for reaching out, i&apos;ll get back to you soon.
              </p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="ct-again"
              >
                send another message
              </button>
            </div>
          ) : (
            <form
              className={`ct-form${status === "leaving" ? " is-leaving" : ""}`}
              onSubmit={handleSubmit}
              noValidate
            >
              <p className="ct-form-head">send a message</p>
              <div className="ct-pair">
                <label className="ct-field">
                  <span className="ct-label">
                    name
                  </span>
                  <input
                    name="name"
                    autoComplete="name"
                    placeholder="your name"
                    disabled={submitting}
                    className="ct-input"
                  />
                </label>
                <label className="ct-field">
                  <span className="ct-label">
                    email
                  </span>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@email.com"
                    disabled={submitting}
                    className="ct-input"
                  />
                </label>
              </div>
              <label className="ct-field">
                <span className="ct-label">
                  subject
                </span>
                <input
                  name="subject"
                  placeholder="what's it about?"
                  disabled={submitting}
                  className="ct-input"
                />
              </label>
              <label className="ct-field">
                <span className="ct-label">
                  message
                </span>
                <textarea
                  name="message"
                  rows={5}
                  placeholder="tell me about it…"
                  disabled={submitting}
                  className="ct-input ct-textarea"
                />
              </label>
              {error && (
                <p role="alert" className="ct-error">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="ct-send"
              >
                <span className="ct-send-text">
                  {submitting ? "sending…" : "send message"}
                </span>
                <Sky />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

const css = `
  .ct-root {
    --pad: clamp(16px, 4vw, 64px);
    --line: color-mix(in srgb, currentColor 14%, transparent);
    max-width: calc(1400px + 2 * var(--pad));
    margin: 0 auto;
    padding: clamp(72px, 11vh, 120px) var(--pad) clamp(80px, 14vh, 160px);
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  }

  .ct-label,
  .ct-form-head,
  .ct-row-label {
    font-size: 10px;
    font-weight: 600;
    line-height: 1.6;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .ct-title {
    margin: 0;
    font-size: clamp(52px, 9vw, 150px);
    font-weight: 600;
    line-height: 0.92;
    letter-spacing: -0.035em;
  }

  .ct-mask {
    display: block;
  }

  .ct-line {
    display: inline-block;
    animation: load-reveal 1.4s ease both;
  }

  .ct-fade {
    animation: ct-fade 1.2s ease both;
  }

  @keyframes ct-fade {
    from { opacity: 0; }
  }

  /* text fades in and comes into focus: the site-wide load-reveal (globals.css). Photos and
     the form just fade. */
  .ct-intro.ct-fade,
  .ct-rows.ct-fade {
    animation-name: load-reveal;
  }

  .ct-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: clamp(48px, 7vh, 72px);
    margin-top: clamp(40px, 7vh, 80px);
  }

  @media (min-width: 1000px) {
    .ct-body {
      grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
      column-gap: clamp(48px, 6vw, 120px);
    }
  }

  @media (max-width: 999px) {
    .ct-body {
      gap: 0;
    }

    .ct-body > .ct-left {
      display: contents;
    }

    .ct-body > .ct-right {
      order: 1;
      margin-bottom: clamp(56px, 9vh, 80px);
    }

    .ct-body .ct-intro {
      order: 2;
      margin-bottom: clamp(24px, 3.5vh, 36px);
    }

    .ct-body .ct-rows {
      order: 3;
    }
  }

  .ct-left {
    display: flex;
    flex-direction: column;
  }

  .ct-photos {
    display: none;
  }

  @media (min-width: 1000px) {
    .ct-photos {
      flex: 1 1 auto;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: clamp(8px, 0.8vw, 14px);
      min-height: 180px;
      margin-top: clamp(28px, 4vh, 40px);
    }
  }

  .ct-photo {
    position: relative;
    overflow: hidden;
    background: color-mix(in srgb, currentColor 6%, transparent);
  }

  .ct-photo img {
    opacity: 0;
    transition: opacity 0.6s ease;
  }

  .ct-photo.is-loaded img {
    opacity: 1;
  }

  .ct-photo::after {
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
    animation: ct-shimmer 1.4s linear infinite;
    transition: opacity 0.5s ease;
    pointer-events: none;
  }

  .ct-photo.is-loaded::after {
    opacity: 0;
    animation: none;
  }

  @keyframes ct-shimmer {
    from { background-position: 120% 0; }
    to { background-position: -120% 0; }
  }

  .ct-intro {
    margin: 0 0 clamp(32px, 5vh, 48px);
    max-width: 24em;
    font-size: clamp(17px, 1.4vw, 20px);
    line-height: 1.35;
    color: color-mix(in srgb, currentColor 72%, transparent);
  }

  .ct-rows {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .ct-row {
    display: grid;
    grid-template-columns: 6.5em minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 12px;
    padding: clamp(14px, 2.2vh, 20px) 0;
    border-top: 1px solid var(--line);
    color: inherit;
    text-decoration: none;
    transition: opacity 0.4s ease;
  }

  .ct-rows li:last-child .ct-row {
    border-bottom: 1px solid var(--line);
  }

  .ct-row-label {
    opacity: 0.55;
  }

  .ct-row-value {
    font-size: clamp(20px, 2vw, 28px);
    font-weight: 500;
    letter-spacing: -0.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .ct-row-arrow {
    width: 18px;
    height: 18px;
    transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @media (hover: hover) {
    .ct-rows:hover .ct-row:not(:hover) {
      opacity: 0.35;
    }

    .ct-row:hover .ct-row-value {
      transform: translateX(0.25em);
    }

    .ct-row:hover .ct-row-arrow {
      transform: rotate(45deg);
    }
  }

  .ct-form {
    display: flex;
    flex-direction: column;
    gap: clamp(22px, 3.4vh, 32px);
  }

  .ct-form-head {
    margin: 0;
    opacity: 0.55;
  }

  .ct-pair {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: clamp(22px, 3.4vh, 32px);
  }

  @media (min-width: 640px) {
    .ct-pair {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      column-gap: 28px;
    }
  }

  .ct-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ct-label {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .ct-input {
    width: 100%;
    padding: 8px 0 12px;
    border: 0;
    border-bottom: 1px solid var(--line);
    border-radius: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: clamp(18px, 1.6vw, 22px);
    line-height: 1.35;
    outline: none;
    transition: border-color 0.3s ease;
  }

  .ct-input::placeholder {
    color: color-mix(in srgb, currentColor 30%, transparent);
  }

  .ct-input:focus {
    border-bottom-color: currentColor;
  }

  .ct-input:disabled {
    opacity: 0.5;
  }

  .ct-textarea {
    min-height: 150px;
    resize: none;
  }

  .ct-error {
    margin: -8px 0 0;
    font-size: 14px;
    color: #d33a2c;
  }

  .ct-send {
    display: flex;
    align-items: center;
    gap: 18px;
    width: 100%;
    margin-top: -6px;
    padding: 6px 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .ct-send-text {
    flex-shrink: 0;
    font-size: clamp(20px, 1.9vw, 26px);
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: -0.015em;
    transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @media (hover: hover) {
    .ct-send:hover:not(:disabled) .ct-send-text {
      transform: translateX(0.2em);
    }
  }

  .ct-sky {
    --plane: 20px;
    position: relative;
    display: block;
    flex: 1 1 auto;
    min-width: 80px;
    height: 60px;
  }

  .ct-plane {
    position: absolute;
    top: 0;
    left: 0;
    transform: translateY(calc((60px - var(--plane)) / 2));
    will-change: transform;
  }

  .ct-plane svg {
    display: block;
    width: var(--plane);
    height: var(--plane);
  }

  .ct-send:disabled {
    cursor: default;
  }

  .ct-send:disabled .ct-send-text {
    opacity: 0.55;
  }

  .ct-send:focus-visible,
  .ct-row:focus-visible,
  .ct-again:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 4px;
  }

  .ct-sent {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    height: 100%;
    min-height: 320px;
  }

  .ct-sent-title,
  .ct-sent-sub,
  .ct-again {
    animation: load-reveal 1s ease both;
  }

  .ct-sent-title { animation-delay: 0s; }
  .ct-sent-sub { animation-delay: 0.12s; }
  .ct-again { animation-delay: 0.24s; }

  .ct-right {
    display: flex;
    flex-direction: column;
  }

  .ct-right > .ct-form {
    flex: 1 1 auto;
    transition: opacity 0.45s ease;
  }

  .ct-form.is-leaving {
    opacity: 0;
    pointer-events: none;
  }

  .ct-sent-title {
    margin: 0;
    font-size: clamp(36px, 4.4vw, 64px);
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.03em;
  }

  .ct-sent-sub {
    margin: 14px 0 0;
    font-size: 17px;
    color: color-mix(in srgb, currentColor 65%, transparent);
  }

  .ct-again {
    margin-top: 28px;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-decoration: underline;
    text-underline-offset: 4px;
    cursor: pointer;
    opacity: 0.6;
  }

  .ct-again:hover {
    opacity: 1;
  }

  @media (max-width: 640px) {
    .ct-row {
      grid-template-columns: minmax(0, 1fr) auto;
      row-gap: 2px;
    }

    .ct-row-label,
    .ct-row-value {
      grid-column: 1;
    }

    .ct-row-arrow {
      grid-column: 2;
      grid-row: 1 / 3;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ct-line,
    .ct-fade,
    .ct-photo::after,
    .ct-sent-title,
    .ct-sent-sub,
    .ct-again {
      animation: none !important;
    }

    .ct-right > .ct-form {
      transition: none;
    }
  }
`;
