'use client'

import Link from 'next/link'
import { useLayoutEffect, useRef, useState } from 'react'

const itemClass = 'flex items-center px-2 py-1 transition-opacity hover:opacity-60'

// Phones only. While open, the page links take over the navbar row: `data-menu-open` on the
// navbar cross-fades them with the name and socials (Navbar css). It stays one row because
// HomeHero and the video and album pages measure the navbar's height.
// The flag goes on the navbar rather than <html> so opening the menu only restyles the navbar,
// not the whole page, and it's set before the next paint so the fade starts on that frame.
export function MobileMenu({ links }: { links: { name: string; path: string }[] }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const nav = rootRef.current?.closest('[data-site-nav]')
    nav?.toggleAttribute('data-menu-open', open)
    return () => nav?.removeAttribute('data-menu-open')
  }, [open])

  return (
    <div ref={rootRef} className="flex items-center sm:hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={itemClass}
      >
        {open ? 'close' : 'menu'}
      </button>

      {/* stays mounted so it can fade out, and sits over the row so the socials can stay put */}
      <ul className="nav-menu-links absolute inset-y-0 right-2 flex items-center">
        {links.map((link) => (
          <li key={link.path}>
            <Link
              href={link.path}
              onClick={() => setOpen(false)}
              className="flex items-center px-1.5 py-1 transition-opacity hover:opacity-60"
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
