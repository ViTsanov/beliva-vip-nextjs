import type { Metadata } from 'next';
import { shareMetadata } from '@/lib/shareMeta';
import AboutUsClient from './AboutUsClient';
import { COMPANY_INFO } from '@/lib/companyInfo';

const { socials } = COMPANY_INFO;

export const metadata: Metadata = {
  title: { absolute: 'За Нас - Поли | Beliva VIP Tour' },
  description: 'Аз съм Поли - 13 години из целия свят, над 80 посетени страни и една голяма любов: пътешествията. Водя с усмивка, спокойствие и сърце.',
  alternates: { canonical: 'https://belivavip.bg/about-us' },
  ...shareMetadata({
    path: '/about-us',
    title: 'За Нас - Поли | Beliva VIP Tour',
    description: 'Аз съм Поли - 13 години из целия свят, над 80 посетени страни и една голяма любов: пътешествията. Водя с усмивка, спокойствие и сърце.',
  }),
};

const schemaData = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  mainEntity: {
    "@type": "TravelAgency",
    name: "Beliva VIP Tour",
    foundingDate: "2010",
    founder: {
      "@type": "Person",
      name: "Паулина Алексиева",
      // Профилите на Поли — празните се пропускат
      ...(socials.tiktok ? { sameAs: [socials.tiktok] } : {}),
    },
    sameAs: [socials.facebook, socials.instagram].filter(Boolean),
    description: "Лицензирана туристическа агенция с лично отношение. Поли води групи по света от 13 години и е посетила над 80 страни.",
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
