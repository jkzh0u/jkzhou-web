"use client";

import { useEffect, useState } from "react";

export default function AlbumGallery({
  album,
}: {
  album: {
    slug: string;
    title: string;
    photos: readonly string[];
  };
}) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (selectedPhoto) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
    }
  }, [selectedPhoto]);

  return (
    <>
      <div className="columns-2 gap-5 space-y-5 sm:columns-3 sm:gap-5">
        {album.photos.map((photo, i) => {
          const src = `/photos/${album.slug}/${photo}`;

          return (
            <button
              key={photo}
              onClick={() => setSelectedPhoto(src)}
              className="group block w-full break-inside-avoid text-left"
            >
              <img
                src={src}
                alt={`${album.title} photo ${i + 1}`}
                className="
                  w-full object-contain
                  transition-all duration-500 ease-out
                  group-hover:scale-[1.015]
                  group-hover:brightness-105
                "
              />
            </button>
          );
        })}
      </div>

      {selectedPhoto && (
        <div
          onClick={() => {
            setVisible(false);

            setTimeout(() => {
              setSelectedPhoto(null);
            }, 300);
          }}
          className={`
            fixed inset-0 z-50 flex items-center justify-center
            bg-black/40 p-4 backdrop-blur-xl
            transition-all duration-300 ease-out
            ${
              visible
                ? "opacity-100 backdrop-blur-xl"
                : "opacity-0 backdrop-blur-none"
            }
          `}
        >
          <img
            src={selectedPhoto}
            alt="Selected photo"
            className={`
              max-h-[88vh] max-w-[82vw] object-contain shadow-2xl
              transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
              ${
                visible
                  ? "scale-100 opacity-100"
                  : "scale-95 opacity-0"
              }
            `}
          />
        </div>
      )}
    </>
  );
}