import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";
import { GoogleAnalytics } from '@next/third-parties/google'
import AIChatWidget from '@/components/AIChatWidget';

// 1. ШРИФТОВЕ
const inter = Inter({ 
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({ 
  subsets: ["latin", "cyrillic"],
  variable: "--font-serif",
  weight: ["400", "700"], // Добавих още дебелини за всеки случай
  display: "swap",
});

// 2. SEO CONSTANTS (Замести с реалните данни!)
const SITE_URL = "https://belivavip.bg"; // Твоят домейн
const SITE_NAME = "Beliva VIP Tour";
const PHONE_NUMBER = "+359887616100"; // Смени с реалния
const ADDRESS = "В момента нямаме физически офис"; // Смени с реалния

// 3. JSON-LD (Schema.org за Google Maps и Local SEO)
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  "name": SITE_NAME,
  "image": `${SITE_URL}/hero/australia.webp`, // Използваме една от hero снимките като fallback лого/имидж
  "@id": SITE_URL,
  "url": SITE_URL,
  "telephone": PHONE_NUMBER,
  "priceRange": "$$$",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      "opens": "09:00",
      "closes": "19:00"
    }
  ],
  "sameAs": [
    "https://www.facebook.com/profile.php?id=61587126843041", // ⚠️ Сложи си линковете към социалните мрежи
    "https://www.instagram.com/belivavip/"
  ]
};

// 4. МЕТАДАННИ (GLOBAL SEO)
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL), // Критично за социалните мрежи!
  title: {
    default: "Beliva VIP Tour | Пътешествия и Екзотика",
    template: "%s | Beliva VIP Tour" // На вътрешни страници ще става: "Дубай | Beliva VIP Tour"
  },
  verification: {
    google: "viW16VYuK01QV2RWtvOofjfCDAZgkvBb1yCYklkXTqg"
  },
  description: "Открийте света с нас. Организиране на екзотични почивки, екскурзии и индивидуални пътешествия до Дубай, Малдиви, Тайланд и още.",
  keywords: ["туристическа агенция", "екскурзии", "почивки", "екзотика", "лукс", "Дубай", "Малдиви", "Тайланд", "Beliva", "tours", "туристическа", "Перу", "екскурзия", "почивка"],
  authors: [{ name: "Beliva VIP Tour" }],
  creator: "Beliva VIP Tour",
  publisher: "Beliva VIP Tour",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Open Graph (За Facebook, Viber, WhatsApp, LinkedIn)
  openGraph: {
    type: "website",
    locale: "bg_BG",
    url: SITE_URL,
    title: "Beliva VIP Tour | Изживейте Изключителното",
    description: "Пътешествия и ексклузивни маршрути, създадени специално за Вас.",
    siteName: SITE_NAME,
    images: [
      {
        url: "/hero/singapore.webp", // Картинка, която излиза при споделяне на началната страница
        width: 1200,
        height: 630,
        alt: "Beliva VIP Tour Destinations",
      },
    ],
  },
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Beliva VIP Tour",
    description: "Ексклузивни пътешествия и почивки.",
    images: ["/hero/singapore.webp"], // Twitter също ползва тази снимка
  },
  icons: {
    icon: [
      { url: '/icon.png' }, // Стандартна икона
      // Ако искаш по-високо качество, може да сложиш и PNG тук:
      // { url: '/icon.png', type: 'image/png' },
    ],
    shortcut: '/icon.png',
    apple: [
      { url: '/icon.png' }, 
    ],
  },
};

// Настройка на Viewport (за мобилни устройства)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#d4af37", // Твоят златен цвят - оцветява браузъра на мобилни телефони
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 👇 ПРЕМАХНАХ КОМЕНТАРА ОТ ТУК, ЗА ДА НЕ ЧУПИ ХИДРАТАЦИЯТА
    <html lang="bg" className="scroll-smooth"> 
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased min-h-screen flex flex-col`}>
        
        {/* JSON-LD Script */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <LayoutWrapper>
          {children}
          <AIChatWidget />
        </LayoutWrapper>
        <GoogleAnalytics gaId="G-FXLJBHSJ6K" /> {/* 👈 Сложи твоя ID тук */}
      </body>
    </html>
  );
}