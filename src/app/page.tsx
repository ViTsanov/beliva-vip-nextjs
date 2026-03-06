import { Suspense } from 'react';
import Hero from '@/components/sections/Hero';
import ToursGrid from '@/components/sections/ToursGrid'; // или components/sections/ToursGrid
import Testimonials from '@/components/Testimonials';
import TopDestinations from '@/components/TopDestinations';
import Advantages from '@/components/Advantages';
import { Metadata } from 'next';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const country = resolvedParams?.country;

  if (country && typeof country === 'string') {
    return {
      title: `Посетете ${country} с нас | Beliva VIP Tour`,
      description: `Разгледайте нашите ексклузивни оферти и екскурзии до ${country}. Резервирайте вашето мечтано пътешествие с Beliva VIP Tour.`,
      alternates: {
        canonical: `https://belivavip.bg/?country=${encodeURIComponent(country)}`
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
      <div className="bg-[#fcf9f2] min-h-[600px]"> 

         <Suspense fallback={<div className="text-center py-20 ">Зареждане на оферти...</div>}>
            <ToursGrid />
         </Suspense>
      </div>

      {/* 3. ОТЗИВИ */}
      <Testimonials />

    </main>
  );
}