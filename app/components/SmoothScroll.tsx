"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { isLiteMode, onLiteMode, startPerfMonitor } from "./perfMode";

let activeLenis: Lenis | null = null;

// The exact scroll position for this frame. window.scrollY only moves in whole pixels, which
// shows up as stepping in anything drawn from it during the slow end of a smooth scroll.
export function getScrollY() {
  return activeLenis?.isScrolling === "smooth"
    ? activeLenis.animatedScroll
    : window.scrollY;
}

export function getLenis() {
  return activeLenis;
}

export default function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    startPerfMonitor();
    // too slow for smooth scroll: the browser's native scroll runs off the main thread
    if (isLiteMode()) return;

    const lenis = new Lenis({
      duration: 1.8,
      smoothWheel: true,
      wheelMultiplier: 0.75,
      touchMultiplier: 1.2,
    });
    lenisRef.current = lenis;
    activeLenis = lenis;

    // Runs on GSAP's ticker, ahead of every other listener, so anything animating on the ticker
    // sees this frame's scroll position instead of the previous frame's.
    const tick = () => lenis.raf(performance.now());
    gsap.ticker.add(tick, false, true);

    // Re-measure whenever the page height changes
    const ro = new ResizeObserver(() => lenis.resize());
    ro.observe(document.body);

    // Re-measure after images/fonts finish loading
    const onLoad = () => lenis.resize();
    window.addEventListener("load", onLoad);

    let destroyed = false;
    const teardown = () => {
      if (destroyed) return;
      destroyed = true;
      gsap.ticker.remove(tick);
      ro.disconnect();
      window.removeEventListener("load", onLoad);
      lenis.destroy();
      lenisRef.current = null;
      activeLenis = null;
    };

    const offLite = onLiteMode(teardown);

    return () => {
      offLite();
      teardown();
    };
  }, []);

  // Re-measure and reset on route change
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    lenis.scrollTo(0, { immediate: true });
    // wait a tick for the new page to render
    const t = setTimeout(() => lenis.resize(), 100);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}