"use client";

import { useRef, type ReactNode } from "react";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
};

export default function TiltCard({
  children,
  className = "",
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    const glow = glowRef.current;

    if (!card || !glow) return;

    const bounds = card.getBoundingClientRect();

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const leftX = mouseX - bounds.left;
    const topY = mouseY - bounds.top;

    const centerX = leftX - bounds.width / 2;
    const centerY = topY - bounds.height / 2;

    const distance = Math.sqrt(centerX ** 2 + centerY ** 2);

    card.style.transform = `
      scale3d(1.04, 1.04, 1.04)
      rotate3d(
        ${centerY / 120},
        ${-centerX / 120},
        0,
        ${Math.log(distance + 1) * 1.8}deg
      )
    `;

    // softer glow
    glow.style.backgroundImage = `
      radial-gradient(
        circle at
        ${centerX * 1.25 + bounds.width / 2}px
        ${centerY * 1.25 + bounds.height / 2}px,
        rgba(255,255,255,0.14),
        rgba(255,255,255,0.05) 22%,
        rgba(255,255,255,0.02) 45%,
        transparent 72%
      )
    `;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    const glow = glowRef.current;

    if (!card || !glow) return;

    card.style.transform = "";

    glow.style.backgroundImage =
      "radial-gradient(circle at 50% -20%, rgba(255,255,255,0.06), transparent 70%)";
  };

  return (
    <div style={{ perspective: "1500px" }}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative transition-[transform,box-shadow] duration-300 ease-out will-change-transform hover:shadow-[0_35px_90px_rgba(0,0,0,0.5)] ${className}`}
      >
        {children}

        <div
          ref={glowRef}
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% -20%, rgba(255,255,255,0.06), transparent 70%)",
          }}
        />
      </div>
    </div>
  );
}