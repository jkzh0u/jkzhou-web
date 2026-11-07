'use client';

import { useState } from 'react';
import Image from 'next/image';
import { experiences, type Experience } from '@/data/experiences';

const REPEATS = 3;

function Logo({
    item,
    on,
    copy,
    onShow,
}: {
    item: Experience;
    on: boolean;
    copy: boolean;
    onShow: (touch: boolean) => void;
}) {
    return (
        <span
            className={`ex-item${on ? ' is-on' : ''}`}
            data-copy={copy ? '' : undefined}
            onPointerEnter={(e) => {
                if (e.pointerType === 'mouse') onShow(false);
            }}
            onPointerDown={(e) => {
                if (e.pointerType !== 'mouse') onShow(true);
            }}
        >
            <span className="ex-logo">
                <Image src={item.logo} alt="" fill sizes="(max-width: 760px) 180px, 280px" loading="eager" />
            </span>
        </span>
    );
}

export default function Experiences() {
    const [hovering, setHovering] = useState<number | null>(null);
    const current = hovering === null ? null : experiences[hovering];

    return (
        <section className="ex-root" aria-labelledby="experience-label">
            <style>{css}</style>

            <p id="experience-label" className="ex-label">
                experience
            </p>

            <ul className="sr-only">
                {experiences.map((item) => (
                    <li key={item.name}>
                        {item.name}
                        {item.blurb ? `: ${item.blurb}` : ''}
                    </li>
                ))}
            </ul>

            <div
                className={`ex-marquee${hovering !== null ? ' is-paused' : ''}`}
                aria-hidden="true"
                onPointerLeave={(e) => {
                    if (e.pointerType === 'mouse') setHovering(null);
                }}
            >
                <div className="ex-track">
                    {[0, 1].map((group) => (
                        <div key={group} className="ex-group">
                            {Array.from({ length: REPEATS }).flatMap((_, rep) =>
                                experiences.map((item, i) => (
                                    <Logo
                                        key={`${rep}-${item.name}`}
                                        item={item}
                                        on={hovering === i}
                                        copy={group > 0 || rep > 0}
                                        onShow={(touch) =>
                                            setHovering((h) => (touch && h === i ? null : i))
                                        }
                                    />
                                ))
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="ex-caption" aria-hidden="true">
                {current && (
                    <div key={current.name} className="ex-caption-body">
                        <p className="ex-caption-name">{current.name}</p>
                        {current.blurb && <p className="ex-caption-blurb">{current.blurb}</p>}
                    </div>
                )}
            </div>
        </section>
    );
}

const css = `
  .ex-root {
    --logo-h: clamp(52px, 5.6vw, 80px);
    --gap: clamp(44px, 6vw, 104px);
    position: relative;
    z-index: 2;
    padding: 4vh 0 12vh;
    background: var(--background, #fff);
    font-family: "Neue Montreal", "Helvetica Neue", Helvetica, Arial, sans-serif;
    text-align: center;
  }

  .ex-label {
    font-size: 10px;
    font-weight: 600;
    line-height: 1.6;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .ex-label {
    margin: 0 0 32px;
  }

  .ex-marquee {
    overflow: hidden;
    width: 100%;
    padding: 8px 0;
  }

  .ex-track {
    display: flex;
    width: max-content;
    animation: ex-scroll 55s linear infinite;
  }

  .ex-group {
    display: flex;
    align-items: center;
    gap: var(--gap);
    padding-right: var(--gap);
  }

  .ex-marquee.is-paused .ex-track {
    animation-play-state: paused;
  }

  @keyframes ex-scroll {
    to { transform: translateX(-50%); }
  }

  .ex-item {
    display: block;
    -webkit-tap-highlight-color: transparent;
  }

  .ex-logo {
    position: relative;
    display: block;
    height: var(--logo-h);
    width: calc(var(--logo-h) * 3);
  }

  .ex-logo img {
    object-fit: contain;
    filter: grayscale(1);
    opacity: 0.55;
    transition:
      filter 0.45s ease,
      opacity 0.45s ease,
      transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .ex-item.is-on .ex-logo img {
    filter: none;
    opacity: 1;
    transform: scale(1.05);
  }

  @media (hover: hover) {
    .ex-item:hover .ex-logo img {
      filter: none;
      opacity: 1;
      transform: scale(1.05);
    }
  }

  .ex-caption {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    min-height: 90px;
    margin-top: 32px;
    padding: 0 clamp(16px, 4vw, 64px);
  }

  .ex-caption-body {
    max-width: 34em;
    animation: ex-fade 0.4s ease both;
  }

  .ex-caption-name {
    margin: 0;
    font-size: clamp(22px, 2.2vw, 30px);
    font-weight: 600;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }

  .ex-caption-blurb {
    margin: 8px 0 0;
    font-size: clamp(16px, 1.3vw, 19px);
    line-height: 1.4;
    color: color-mix(in srgb, currentColor 65%, transparent);
  }

  @keyframes ex-fade {
    from { opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .ex-marquee {
      overflow-x: auto;
    }

    .ex-track {
      animation: none;
      padding: 0 clamp(16px, 4vw, 64px);
    }

    .ex-group + .ex-group,
    .ex-item[data-copy] {
      display: none;
    }

    .ex-caption-body {
      animation: none;
    }
  }
`;
