"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

interface Props {
  children: React.ReactNode;
  imageSrc: string;
  tooltip?: string;
  color?: string;
  href?: string;
}

export function HighlightedText({
  children,
  imageSrc,
  tooltip,
  color = "#b9cbe8",
  href,
}: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const popupWidth = 240;
  const popupImageHeight = 150;
  const popupHeight = tooltip ? 190 : popupImageHeight;

  useEffect(() => {
    setMounted(true);

    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkDesktop();
    window.addEventListener("resize", checkDesktop);

    return () => {
      window.removeEventListener("resize", checkDesktop);
    };
  }, []);

  const getCoords = (clientX: number, clientY: number) => {
    const clampedX = Math.min(
      Math.max(clientX, popupWidth / 2 + 12),
      window.innerWidth - popupWidth / 2 - 12
    );

    let nextY = clientY - popupHeight - 18;

    if (nextY < 12) {
      nextY = clientY + 18;
    }

    return {
      x: clampedX - popupWidth / 2,
      y: nextY,
    };
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setIsHovered(true);

    if (!isDesktop) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setCoords(getCoords(e.clientX, e.clientY));

    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 70);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isDesktop) return;

    setCoords(getCoords(e.clientX, e.clientY));
  };

  const handleMouseLeave = () => {
    setIsHovered(false);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setIsOpen(false);
  };

  return (
    <>
      <a
        ref={ref}
        href={href}
        target={href ? "_blank" : undefined}
        rel={href ? "noopener noreferrer" : undefined}
        className="no-underline transition-all duration-300 ease-out"
        style={{
          backgroundColor: color,
          color: isHovered ? "var(--color-background)" : "inherit",
          padding: "0 10px",
          lineHeight: "0.9",
          borderRadius: "0px",
          display: "inline-block",
          transform: "translateY(0.04em)",
          filter: isHovered ? "brightness(1.12)" : "brightness(1)",
          textDecoration: "none",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </a>

      {mounted &&
        isDesktop &&
        createPortal(
          <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
            {isOpen && (
              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.8,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                }}
                style={{
                  position: "absolute",
                  left: coords.x,
                  top: coords.y,
                  width: popupWidth,
                  transformOrigin: "bottom center",
                  pointerEvents: "none",
                }}
                className="overflow-hidden shadow-xl"
              >
                <img
                  src={imageSrc}
                  alt=""
                  className="block object-cover"
                  style={{
                    width: popupWidth,
                    height: popupImageHeight,
                  }}
                  onError={() => {
                    setIsOpen(false);
                  }}
                />

                {tooltip && (
                  <div className="bg-white px-3 py-2 text-sm leading-snug text-black dark:bg-neutral-950 dark:text-white">
                    {tooltip}
                  </div>
                )}
              </motion.div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

export default HighlightedText;