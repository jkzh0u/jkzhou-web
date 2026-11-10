'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const itemClass = 'flex items-center px-2 py-1 transition-opacity hover:opacity-60'

// Phones only. While open, the page links take over the navbar row: `nav-open` on <html>
// cross-fades them with the name and socials (Navbar css). It stays one row because
// HomeHero and the video and album pages measure the navbar's height.
export function MobileMenu({ links }: { links: { name: string; path: string }[] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const html = document.documentElement
    html.classList.toggle('nav-open', open)
    return () => html.classList.remove('nav-open')
  }, [open])

  return (
    <div className="flex items-center sm:hidden">
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
