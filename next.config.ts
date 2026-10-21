import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF програмата на тура (src/lib/pdf): @react-pdf се зарежда от node_modules, а не се пакетира, а шрифтовете
  // и логото, които чете от диска, трябва да влязат в сървърната версия на сайта
  serverExternalPackages: ['@react-pdf/renderer'],
  outputFileTracingIncludes: {
    '/tour/[id]/programa.pdf': ['./src/assets/fonts/**/*', './public/beliva_logo.png'],
    '/api/admin/tour-pdf': ['./src/assets/fonts/**/*', './public/beliva_logo.png'],
  },
  images: {
    // Firebase App Hosting изключва вградената оптимизация на снимки, ако това не е зададено изрично. Без него <Image>
    // сервираше оригиналния файл (напр. 600 KB снимка за кръгче от 56px). https://firebase.google.com/docs/app-hosting/optimize-image-loading
    unoptimized: false,
    remotePatterns: [
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'docs.google.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      // Unsplash (tour cover images)
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      // Common CDNs that may appear in tour images
      { protocol: 'https', hostname: '*.cloudinary.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'cdn.pixabay.com' },
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: '**' },
    ],
    // Only WebP: AVIF encoding is several times slower on the server (sharp, 512MiB instance), so the
    // first visitor of every image/size waited seconds for it to be generated. WebP is nearly as small.
    formats: ['image/webp'],
    // Keep optimized images cached for 31 days (default is much shorter). The Cache-Control header
    // also lets the App Hosting CDN serve them from the edge instead of re-optimizing on each instance.
    minimumCacheTTL: 2678400,
    // All quality values used across the app
    qualities: [40, 75, 80, 85, 90],
    // Allow larger images for hero/gallery quality
    // 2560 — за големи/ретина екрани: оригиналите в библиотеката са до 2000px, а без тази стъпка те получаваха 1920
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2560],
    imageSizes: [16, 32, 64, 96, 128, 256, 300, 384],
  },
};

export default nextConfig;