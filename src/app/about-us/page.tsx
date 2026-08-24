import type { Metadata } from 'next';
import AboutUsClient from './AboutUsClient';

export const metadata: Metadata = {
  title: { absolute: 'За Нас — Поли | Beliva VIP Tour' },
  description: 'Запознайте се с Поли — човекът зад Beliva VIP Tour. Над 15 години опит, над 60 дестинации и над 150 лично водени групи.',
  alternates: { canonical: 'https://belivavip.bg/about-us' },
};

const schemaData = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  mainEntity: {
    "@type": "TravelAgency",
    name: "Beliva VIP Tour",
    foundingDate: "2010",
    founder: { "@type": "Person", name: "Паулина Алексиева" },
    description: "Лицензирана туристическа агенция с лично отношение и над 15 години опит.",
    url: "https://belivavip.bg",
  },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <AboutUsClient />
    </>
  );
}
