import { Suspense } from 'react';
import Hero from '@/components/sections/Hero';
import ToursGrid from '@/components/sections/ToursGrid'; // или components/sections/ToursGrid
import Testimonials from '@/components/Testimonials';
import TopDestinations from '@/components/TopDestinations';
import Advantages from '@/components/Advantages';

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