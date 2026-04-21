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
<div className="overflow-hidden whitespace-nowrap py-4 border-y border-neutral-800 dark:border-neutral-200">
  <div ref={marqueeRef} className="flex w-max">
    {Array.from({ length: 20 }).map((_, i) => (
      <span
        key={i}
        className="px-8 text-5xl font-bold text-black dark:text-white"
      >
        JACKSON ZHOU.
      </span>
    ))}
  </div>
</div>
  )
}