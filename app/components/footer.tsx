function ArrowIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.07102 11.3494L0.963068 10.2415L9.2017 1.98864H2.83807L2.85227 0.454545H11.8438V9.46023H10.2955L10.3097 3.09659L2.07102 11.3494Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="my-16">
      <div className="flex justify-between items-center py-8 max-w-6xl mx-auto">
        {/* Left: your text */}
        <div>
        <p className="text-4xl font-bold text-neutral-600 dark:text-neutral-300">jackson zhou</p>
        <p className="text-neutral-600 dark:text-neutral-300">hello@jkzhou.ca</p>
        </div>
        {/* Right: links + copyright */}
        <div className="flex flex-col items-end">
          <ul className="flex flex-row space-x-4 text-neutral-600 dark:text-neutral-300">
            <li><a draggable={false} rel="noopener noreferrer" target="_blank" href="https://www.instagram.com/jkz.mov/" className="flex items-center transition-all hover:text-neutral-800 dark:hover:text-neutral-100"><ArrowIcon /><p className="ml-2">instagram</p></a></li>
            <li><a draggable={false} rel="noopener noreferrer" target="_blank" href="https://www.linkedin.com/in/jackson-zhou-9a5703297/" className="flex items-center transition-all hover:text-neutral-800 dark:hover:text-neutral-100"><ArrowIcon /><p className="ml-2">linkedin</p></a></li>
            <li><a draggable={false} href="/contact" className="flex items-center transition-all hover:text-neutral-800 dark:hover:text-neutral-100"><ArrowIcon /><p className="ml-2">contact</p></a></li>
          </ul>
          <p className="mt-2 text-neutral-600 dark:text-neutral-300">© {new Date().getFullYear()} Jackson Zhou. All rights reserved</p>
        </div>
      </div>
    </footer>
  )
}