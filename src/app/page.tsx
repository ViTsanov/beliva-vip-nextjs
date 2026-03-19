import { Suspense } from 'react';
import Hero from '@/components/sections/Hero';
import ToursGrid from '@/components/sections/ToursGrid';
import Testimonials from '@/components/Testimonials';
import TopDestinations from '@/components/TopDestinations';
import Advantages from '@/components/Advantages';
import { Metadata } from 'next';
import { WORLD_COUNTRIES } from '@/lib/constants'; // 1. Импортирай списъка
import { slugify } from '@/lib/admin-helpers';     // 2. Импортирай slugify

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const countrySlug = resolvedParams?.country; // Това ще е "tailand"

  if (countrySlug && typeof countrySlug === 'string') {
    // 3. Търсим българското име чрез сравнение на slugs
    const countryName = WORLD_COUNTRIES.find(c => slugify(c) === countrySlug) || countrySlug;

    // 4. Сега името ще е "Тайланд"
    return {
      title: `Посетете ${countryName} с нас | Beliva VIP Tour`,
      description: `Разгледайте нашите ексклузивни оферти и екскурзии до ${countryName}. Резервирайте вашето мечтано пътешествие с Beliva VIP Tour.`,
      alternates: {
        // Canonical линкът остава със slug-а, защото това е официалният URL
        canonical: `https://belivavip.bg/?country=${countrySlug}`
      }
    };
  }

  return {
    title: "Начало | Beliva VIP Tour",
    description: "Открийте света с нас. Организиране на екзотични почивки, екскурзии и индивидуални пътешествия.",
    alternates: {
      canonical: "https://belivavip.bg"
    }
  };
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fcf9f2]">
      
      {/* 1. HERO - Цял екран (h-screen) */}
      <Hero />

      <Advantages />

      <TopDestinations />

      {/* 2. ТЪРСАЧКА + ОФЕРТИ - Започват веднага след Hero-то */}
      <div id="tours-grid" className="bg-[#fcf9f2] min-h-[600px]"> 

         <Suspense fallback={<div className="text-center py-20 ">Зареждане на оферти...</div>}>
            <ToursGrid />
         </Suspense>
      </div>

      {/* 3. ОТЗИВИ */}
      <Testimonials />

    </main>
  );
}