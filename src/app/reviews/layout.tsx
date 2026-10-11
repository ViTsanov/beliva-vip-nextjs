import type { Metadata } from 'next';

// page.tsx е "use client" и не може да експортира metadata — затова заглавието/описанието са тук.
export const metadata: Metadata = {
  title: 'Отзиви от клиенти',
  description: 'Истории и оценки от пътешественици, пътували с Beliva VIP Tour – екскурзии с водач до Азия, Австралия, Америка и още.',
  alternates: { canonical: 'https://belivavip.bg/reviews' },
};

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
