'use client'
import { useEffect, useRef } from 'react'

export default function ScrollBanner() {
  const marqueeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (marqueeRef.current) {
        marqueeRef.current.style.transform = `translateX(-${window.scrollY * 0.3}px)`
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
<div className="overflow-hidden whitespace-nowrap py-4 border-y border-neutral-600 dark:border-neutral-300">
  <div ref={marqueeRef} className="flex w-max">
    {Array.from({ length: 20 }).map((_, i) => (
      <span
        key={i}
        className="px-8 text-5xl font-bold text-neutral-600 dark:text-neutral-300"
      >
        JACKSON ZHOU.
      </span>
    ))}
  </div>
</div>
  )
}