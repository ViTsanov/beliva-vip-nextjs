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
          goldDeep: "#7f620e", // По-тъмно злато за ТЕКСТ върху светъл фон (контраст ≥ 4.5:1)
          mist: "#eef2f7", // Светъл тон от тъмносиньото — второстепенен фон на секции (CTA)
          cream: "#f7f0e4", // Топлият беж — секцията с Поли под героса и MeetGuides
        },
      },
      fontFamily: {
        // Next.js инжектира CSS променливи, тези имена трябва да съвпадат с layout.tsx
        sans: ["var(--font-sans)"], 
        serif: ["var(--font-serif)"],
        display: ["var(--font-display)"],
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