"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

export default function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.8,
      smoothWheel: true,
      wheelMultiplier: 0.75,
      touchMultiplier: 1.2,
    });
    lenisRef.current = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Re-measure whenever the page height changes
    const ro = new ResizeObserver(() => lenis.resize());
    ro.observe(document.body);

    // Re-measure after images/fonts finish loading
    const onLoad = () => lenis.resize();
    window.addEventListener("load", onLoad);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener("load", onLoad);
      lenis.destroy();
      lenisRef.current = null;
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