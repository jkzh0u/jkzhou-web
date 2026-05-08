'use client'

export default function ScrollBanner() {
  return (
    <>
      <style jsx>{`
        @keyframes slide-left {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-8%);
          }
        }

        .marquee {
          animation: slide-left 20s linear infinite;
        }
      `}</style>

      <div className="relative overflow-hidden whitespace-nowrap py-4">
        
        {/* left fade */}
        <div
          className="pointer-events-none absolute left-0 top-0 z-10 h-full w-32 bg-gradient-to-r to-transparent"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--background), transparent)',
          }}
        />

        {/* right fade */}
        <div
          className="pointer-events-none absolute right-0 top-0 z-10 h-full w-32 bg-gradient-to-l to-transparent"
          style={{
            backgroundImage:
              'linear-gradient(to left, var(--background), transparent)',
          }}
        />

        <div className="flex w-max marquee">
          {[...Array(2)].map((_, group) => (
            <div key={group} className="flex">
              {Array.from({ length: 20 }).map((_, i) => (
                <span
                  key={i}
                  className="px-8 text-5xl font-bold text-neutral-600 dark:text-neutral-300"
                >
                  JACKSON ZHOU.
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}