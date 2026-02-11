import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // 👈 Този символ (**) разрешава снимки от ВСЕКИ домейн
      },
    ],
  },
};

export default nextConfig;