'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { albums } from "@/data/albums";
import Image from 'next/image';

const heroItems = albums
  .filter((album) => album.size === "big")
  .map((album) => ({
    title: album.title,
    subtitle: album.subtitle,
    image: `/photos/${album.slug}/${album.cover}`,
    href: `/photos/${album.slug}`,
  }));

const smallItems = albums
  .filter((album) => album.size === "small")
  .map((album) => ({
    title: album.title,
    subtitle: album.subtitle,
    image: `/photos/${album.slug}/${album.cover}`,
    href: `/photos/${album.slug}`,
  }));

export default function PhotosShowcase() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const lockedRef = useRef(false)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const isHorizontal = useRef<boolean | null>(null)

  const [ready, setReady] = useState(false)
  const [canAnimate, setCanAnimate] = useState(false)
  const [wrapperWidth, setWrapperWidth] = useState(0)
  const [index, setIndex] = useState(heroItems.length)
  const [transition, setTransition] = useState(false)

  const gap = 16
  const smallGap = 16

  const heroWidth = wrapperWidth * 0.75
  const heroSide = (wrapperWidth - heroWidth) / 2
  const smallWidth = (wrapperWidth - smallGap * 2) / 3

  const heroSlides = [...heroItems, ...heroItems, ...heroItems]
  const smallSlides = [...smallItems, ...smallItems, ...smallItems]

  useLayoutEffect(() => {
    const width =
      wrapperRef.current?.getBoundingClientRect().width || window.innerWidth
    setWrapperWidth(width)
    setReady(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setCanAnimate(true)
        setTransition(true)
      })
    })
  }, [])

  useEffect(() => {
    const updateWidth = () => {
      const width =
        wrapperRef.current?.getBoundingClientRect().width || window.innerWidth
      setWrapperWidth(width)
    }
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const navigate = (dir: 1 | -1) => {
    if (lockedRef.current) return
    lockedRef.current = true
    setTransition(true)
    setIndex((prev) => prev + dir)
  }

  // Wheel (desktop)
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY)
      if (!horizontal) return
      e.preventDefault()
      if (Math.abs(e.deltaX) < 35) return
      navigate(e.deltaX > 0 ? 1 : -1)
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // Touch (mobile) — on document so child elements can't block it
  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      isHorizontal.current = null
    }
    const onMove = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return
      const dx = e.touches[0].clientX - touchStartX.current
      const dy = e.touches[0].clientY - touchStartY.current
      if (isHorizontal.current === null) {
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5)
          isHorizontal.current = Math.abs(dx) > Math.abs(dy)
        return
      }
      if (isHorizontal.current) e.preventDefault()
    }
    const onEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || isHorizontal.current !== true) {
        touchStartX.current = null; touchStartY.current = null; isHorizontal.current = null
        return
      }
      const dx = e.changedTouches[0].clientX - touchStartX.current
      touchStartX.current = null; touchStartY.current = null; isHorizontal.current = null
      if (Math.abs(dx) < 40) return
      navigate(dx < 0 ? 1 : -1)
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
  }, [])

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform') return
    if (e.currentTarget !== e.target) return
    if (index >= heroItems.length * 2) {
      setTransition(false)
      setIndex(heroItems.length)
      lockedRef.current = false
      return
    }
    if (index <= heroItems.length - 1) {
      setTransition(false)
      setIndex(heroItems.length * 2 - 1)
      lockedRef.current = false
      return
    }
    lockedRef.current = false
  }

  useEffect(() => {
    if (!transition && canAnimate) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setTransition(true))
      })
    }
  }, [transition, canAnimate])

  const activeIndex =
    ((index % heroItems.length) + heroItems.length) % heroItems.length

  const heroX = heroSide - index * (heroWidth + gap)
  const smallX = -index * (smallWidth + smallGap)

  return (
    <section className="flex min-h-[calc(100vh-56px)] w-full flex-col justify-center overflow-hidden bg-neutral-950 py-8 text-white">
      <div
        ref={wrapperRef}
        className="relative overflow-hidden overscroll-x-contain"
      >
        {ready && (
          <>
            <div
              onTransitionEnd={handleTransitionEnd}
              className={`
                flex will-change-transform
                ${transition && canAnimate
                  ? 'transition-transform duration-[1850ms] ease-[cubic-bezier(0.2,0.9,0.25,1)]'
                  : ''}
              `}
              style={{ gap, transform: `translate3d(${heroX}px, 0, 0)` }}
            >
              {heroSlides.map((item, i) => (
                <a key={i} href={item.href} className="group block">
                  <div
                    className="relative h-[52vh] min-h-[420px] flex-none overflow-hidden rounded-[18px] shadow-2xl transition-all duration-500 ease-out hover:scale-[1.015] hover:brightness-110"
                    style={{ width: heroWidth }}
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="75vw"
                      priority={i === heroItems.length}
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent transition-opacity duration-500 group-hover:opacity-20" />
                    <div className="absolute bottom-6 left-0 right-0 px-4 text-center text-white sm:bottom-8 sm:left-8 sm:right-auto sm:px-0 sm:text-left">
                      <h2 className="mb-2 text-4xl font-bold sm:text-5xl">{item.title}</h2>
                      <p className="text-lg text-white/80 sm:text-xl">{item.subtitle}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <div
              className={`
                mt-4 flex will-change-transform
                ${transition && canAnimate
                  ? 'transition-transform duration-[1850ms] ease-[cubic-bezier(0.2,0.9,0.25,1)]'
                  : ''}
              `}
              style={{ gap: smallGap, transform: `translate3d(${smallX}px, 0, 0)` }}
            >
              {smallSlides.map((item, i) => (
                <a key={i} href={item.href} className="group block">
                  <div
                    className="relative h-[27vh] min-h-[210px] flex-none overflow-hidden rounded-[18px] transition-all duration-500 ease-out hover:scale-[1.02] hover:brightness-110 hover:shadow-2xl"
                    style={{ width: smallWidth }}
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="33vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent transition-opacity duration-500 group-hover:opacity-20" />
                    <div className="absolute bottom-4 left-0 right-0 px-3 text-center text-white sm:bottom-5 sm:left-5 sm:right-auto sm:px-0 sm:text-left">
                      <p className="text-base font-semibold sm:text-lg">{item.title}</p>
                      <p className="text-xs text-white/80 sm:text-sm">{item.subtitle}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </div>

      {ready && (
        <div className="mt-6 flex justify-center gap-2">
          {heroItems.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (lockedRef.current) return
                lockedRef.current = true
                setTransition(true)
                setIndex(heroItems.length + i)
              }}
              className={`h-2 rounded-full transition-all duration-300 ${i === activeIndex ? 'w-7 bg-white' : 'w-2 bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}