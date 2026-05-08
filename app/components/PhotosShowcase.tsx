'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const heroItems = [
  {
    title: 'photo 1',
    subtitle: 'photo',
    image:
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2000&auto=format&fit=crop',
    href: '/photos/example',
  },
  {
    title: 'photo 2',
    subtitle: 'photo',
    image:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=2000&auto=format&fit=crop',
    href: '/photos/example',
  },
  {
    title: 'photo 3',
    subtitle: 'photo',
    image:
      'https://images.unsplash.com/photo-1519608487953-e999c86e7455?q=80&w=2000&auto=format&fit=crop',
    href: '/photos/example',
  },
  {
    title: 'photo 4',
    subtitle: 'photo',
    image:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2000&auto=format&fit=crop',
    href: '/photos/example',
  },
]

const smallItems = [
  {
    title: 'photo 1',
    subtitle: 'photo',
    image:
      'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=1200&auto=format&fit=crop',
    href: '/item-1',
  },
  {
    title: 'photo 2',
    subtitle: 'photo',
    image:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
    href: '/item-2',
  },
  {
    title: 'photo 3',
    subtitle: 'photo',
    image:
      'https://images.unsplash.com/photo-1511300636408-a63a89df3482?q=80&w=1200&auto=format&fit=crop',
    href: '/item-3',
  },
  {
    title: 'photo 4',
    subtitle: 'photo',
    image:
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=1200&auto=format&fit=crop',
    href: '/item-4',
  },
]

export default function PhotosShowcase() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const lockedRef = useRef(false)

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

  const next = () => {
    if (lockedRef.current) return
    lockedRef.current = true
    setTransition(true)
    setIndex((prev) => prev + 1)
  }

  const prev = () => {
    if (lockedRef.current) return
    lockedRef.current = true
    setTransition(true)
    setIndex((prev) => prev - 1)
  }

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const handler = (e: WheelEvent) => {
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY)
      if (!horizontal) return

      e.preventDefault()
      if (Math.abs(e.deltaX) < 35) return

      if (e.deltaX > 0) next()
      else prev()
    }

    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
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
                ${
                  transition && canAnimate
                    ? 'transition-transform duration-[1850ms] ease-[cubic-bezier(0.2,0.9,0.25,1)]'
                    : ''
                }
              `}
              style={{
                gap,
                transform: `translate3d(${heroX}px, 0, 0)`,
              }}
            >
              {heroSlides.map((item, i) => (
                <a key={i} href={item.href} className="group block">
                  <div
                    className="
                      relative h-[52vh] min-h-[420px] flex-none overflow-hidden shadow-2xl
                      transition-all duration-500 ease-out
                      hover:scale-[1.015] hover:brightness-110
                    "
                    style={{ width: heroWidth }}
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="
                        absolute inset-0 h-full w-full object-cover
                        transition-transform duration-500 ease-out
                        group-hover:scale-105
                      "
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent transition-opacity duration-500 group-hover:opacity-20" />

                    <div className="absolute bottom-8 left-8 text-white">
                      <h2 className="mb-2 text-5xl font-bold">{item.title}</h2>
                      <p className="text-xl text-white/80">{item.subtitle}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <div
              className={`
                mt-4 flex will-change-transform
                ${
                  transition && canAnimate
                    ? 'transition-transform duration-[1850ms] ease-[cubic-bezier(0.2,0.9,0.25,1)]'
                    : ''
                }
              `}
              style={{
                gap: smallGap,
                transform: `translate3d(${smallX}px, 0, 0)`,
              }}
            >
              {smallSlides.map((item, i) => (
                <a key={i} href={item.href} className="group block">
                  <div
                    className="
                      relative h-[27vh] min-h-[210px] flex-none overflow-hidden
                      transition-all duration-500 ease-out
                      hover:scale-[1.02] hover:brightness-110 hover:shadow-2xl
                    "
                    style={{ width: smallWidth }}
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="
                        absolute inset-0 h-full w-full object-cover
                        transition-transform duration-500 ease-out
                        group-hover:scale-110
                      "
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent transition-opacity duration-500 group-hover:opacity-20" />

                    <div className="absolute bottom-5 left-5 text-white">
                      <p className="text-lg font-semibold">{item.title}</p>
                      <p className="text-sm text-white/80">{item.subtitle}</p>
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
              className={`
                h-2 rounded-full transition-all duration-300
                ${i === activeIndex ? 'w-7 bg-white' : 'w-2 bg-white/40'}
              `}
            />
          ))}
        </div>
      )}
    </section>
  )
}