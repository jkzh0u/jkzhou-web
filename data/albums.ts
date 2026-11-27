// Each album appears on /photos as its cover plus its `field` photos.
//   field: filenames from photos/<slug>/ to show alongside the cover, e.g.
//     field: ["4.jpg", "12.jpg", "27.jpg"],
//   leave it empty and only the cover is shown.
// Newest first, by when the photos were taken (from their EXIF dates).
export const albums = [
  // taken 2026-09-25
  {
    slug: "wave2earth2026",
    title: "wave to earth",
    subtitle: "the () pieces tour in toronto",
    metaTitle: "wave to earth concert photos, toronto 2026",
    metaDescription:
      "concert photos from wave to earth's the () pieces tour in toronto.",
    cover:
      "1.jpg",
    field: ["2.jpg", "13.jpg", "15.jpg"],
  },

  // {
  //   slug: "micahfunc09-04-26",
  //   title: "mic function",
  //   subtitle: "sept 4, 2026",
  //   cover:
  //     "JKZ06255.jpg",
  //   size: "big",
  //   photos: [],
  //   field: [],
  // },

  // taken 2025-02-08
  {
    slug: "chantys18",
    title: "Chantle's 18th birthday",
    subtitle: "chanty's debut",
    metaTitle: "18th birthday photos",
    metaDescription: "photos from an 18th birthday celebration.",
    cover:
      "photosv1--19.jpg",
    size: "small",
    field: [],
  },

  // taken 2024-11-14
  {
    slug: "2024gloco",
    title: "gloco 2024",
    subtitle: "@ mary ward css",
    metaTitle: "gloco 2024 photos, mary ward css",
    metaDescription: "photos from gloco 2024 at mary ward css.",
    cover: "cover.jpg",
    field: [],
  },

  // taken 2024-09-19 (midday, same day as the senior sunrise)
  {
    slug: "2025fallbbq",
    title: "2025 fall sac bbq",
    subtitle: "@ mary ward css",
    metaTitle: "2025 fall sac bbq photos, mary ward css",
    metaDescription:
      "photos from the 2025 fall sac bbq at mary ward css.",
    cover: "cover.jpg",
    photos: [
      "1.jpg",
      "2.jpg",
    ],
    field: ["IMG_9643.jpg"],
  },

  // taken 2024-09-19 (morning)
  {
    slug: "2024sunrise",
    title: "07s senior sunrise",
    subtitle: "@ mary ward css",
    metaTitle: "07s senior sunrise photos, mary ward css",
    metaDescription:
      "photos from the 07s senior sunrise at mary ward css.",
    cover: "cover.jpg",
    field: ["IMG_9330"],
  },

  // taken 2023-12-24 to 2024-06-15, placed by its latest photos
  {
    slug: "downtowntoronto",
    title: "downtown toronto dump",
    subtitle: "photos of toronto, taken at various points in time!",
    metaTitle: "downtown toronto photos",
    metaDescription: "personal photos of downtown toronto.",
    cover:
      "IMG_0032.jpg",
    field: ["IMG_0034-Enhanced-NR", "IMG_2645", "IMG_7233"],
  },

  // taken 2024-03-16
  {
    slug: "2024robotics",
    title: "5596 crescendo",
    subtitle: "FRC 2024 game",
    metaTitle: "FRC team 5596 crescendo photos, 2024",
    metaDescription:
      "photos of FIRST Robotics Competition team 5596 during the 2024 crescendo game.",
    cover:
      "IMG_1377.jpg",
    field: ["IMG_2582.jpg", "IMG_1837.jpg"],
  },

  // taken 2024-02-25
  {
    slug: "2024autoshow",
    title: "autoshow",
    subtitle: "2024",
    metaTitle: "autoshow 2024 photos",
    metaDescription: "photos from the 2024 autoshow.",
    cover:
      "IMG_1032.jpg",
    size: "small",
    field: ["IMG_1055 ed.jpg", "IMG_1100"],
  },

  // taken 2023-11-16
  {
    slug: "2023gloco",
    title: "gloco 2023",
    subtitle: "@ mary ward",
    metaTitle: "gloco 2023 photos, mary ward css",
    metaDescription: "photos from gloco 2023 at mary ward css.",
    cover:
      "cover.jpg",
    field: [],
  },
] as const;
