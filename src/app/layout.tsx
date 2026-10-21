import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Unbounded } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";
import ConditionalAnalytics from '@/components/ConditionalAnalytics';
import { LazyAIChatWidget } from '@/components/LazyClient';
import { COMPANY_INFO } from '@/lib/companyInfo';
import { SHARE_IMAGE_SIZE, defaultShareImage, homeShareImage } from '@/lib/shareMeta';

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

// Широк геометричен шрифт за дисплей текст в hero-то (името на дестинацията). Variable — една заявка за всички дебелини.
const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
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
  "image": homeShareImage(), // Първата hero снимка като JPEG 1200×630 — същата като в превюто на началната страница
  "logo": `${SITE_URL}/beliva_logo.png`,
  "@id": SITE_URL,
  "url": SITE_URL,
  "telephone": PHONE_NUMBER,
  "email": COMPANY_INFO.email,
  // Без физически офис — агенцията обслужва клиенти от цялата страна
  "areaServed": { "@type": "Country", "name": "България" },
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
    // Заглавието на началната страница: основната ключова дума („екскурзии с водач“) отпред, до ~60 знака
    default: "Екскурзии с водач и групови пътувания | Beliva VIP Tour",
    template: "%s | Beliva VIP Tour" // На вътрешни страници ще става: "Дубай | Beliva VIP Tour"
  },
  verification: {
    google: "viW16VYuK01QV2RWtvOofjfCDAZgkvBb1yCYklkXTqg"
  },
  // Само дестинации, които реално са в каталога (Дубай/Малдиви ги няма). meta keywords е махнат — Google не го ползва.
  description: "Групови екскурзии с водач до Китай, Япония, Австралия, Нова Зеландия, Перу и още. Малки групи и маршрути, лично проверени от Поли.",
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
  // Open Graph (За Facebook, Messenger, Viber, WhatsApp, LinkedIn) — само за страниците без собствен openGraph
  // (чек-аут, обратна връзка, 404). Публичните страници дават свой адрес, заглавие и снимка през shareMetadata()
  // (src/lib/shareMeta.ts). Тук няма og:url — иначе всяка такава страница се споделя като началната.
  openGraph: {
    type: "website",
    locale: "bg_BG",
    title: "Beliva VIP Tour | Изживейте Изключителното",
    description: "Групови екскурзии с водач до Китай, Япония, Австралия, Нова Зеландия, Перу и още.",
    siteName: SITE_NAME,
    images: [{ url: defaultShareImage(), ...SHARE_IMAGE_SIZE, type: "image/jpeg", alt: "Beliva VIP Tour — екскурзии с водач" }],
  },
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Beliva VIP Tour",
    description: "Групови екскурзии с водач до Китай, Япония, Австралия, Нова Зеландия, Перу и още.",
    images: [{ url: defaultShareImage(), ...SHARE_IMAGE_SIZE, type: "image/jpeg", alt: "Beliva VIP Tour — екскурзии с водач" }],
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
    // data-scroll-behavior: Next изключва плавното скролиране при смяна на страница — новата страница се отваря направо горе
    <html lang="bg" className="scroll-smooth" data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${playfair.variable} ${unbounded.variable} font-sans antialiased min-h-screen flex flex-col`}>
        
        {/* JSON-LD Script */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <LayoutWrapper>
          {children}
          <LazyAIChatWidget />
        </LayoutWrapper>
        <ConditionalAnalytics /> {/* GA се зарежда само след изрично съгласие в CookieConsent */}
      </body>
    </html>
  );
}