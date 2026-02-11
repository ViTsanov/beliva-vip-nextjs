import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // Специфично за Firebase
      },

    ],
    formats: ['image/avif', 'image/webp'] // Това е супер! AVIF е най-лекият формат в момента.
  },
};

export default nextConfig;