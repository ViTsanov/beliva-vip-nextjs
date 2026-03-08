import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#0f172a", // Тъмносиньо
          gold: "#d4af37", // Златисто
        },
      },
      fontFamily: {
        // Next.js инжектира CSS променливи, тези имена трябва да съвпадат с layout.tsx
        sans: ["var(--font-sans)"], 
        serif: ["var(--font-serif)"],
      },
      // 👇 ДОБАВЯМЕ АНИМАЦИЯТА ЗА ОТБЛЯСЪК ТУК 👇
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-150%) skewX(-12deg)' },
          '100%': { transform: 'translateX(250%) skewX(-12deg)' },
        },
      },
      animation: {
        shimmer: 'shimmer 3s infinite',
      },
      // 👆 ---------------------------------- 👆
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;