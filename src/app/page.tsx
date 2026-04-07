import Hero from "@/components/sections/Hero";
import ToursGrid from "@/components/sections/ToursGrid";
import TopDestinations from "@/components/TopDestinations";
import Advantages from "@/components/Advantages";
import Testimonials from "@/components/Testimonials";
import { Suspense } from "react";
import { getActiveTours } from "@/services/tourService"; // 👈 Импортираме нашия чист сервиз

// 🚀 КЕШИРАНЕ: Началната страница се прегенерира на всеки 60 минути
export const revalidate = 3600; 

export default async function HomePage() {
  // Извикваме всички публични екскурзии чрез адаптера.
  // Вече нямаме нужда от db, collection, getDocs и serializeData тук!
  const tours = await getActiveTours();

  return (
    <main className="min-h-screen bg-brand-light pb-20">
      <Hero />
      
      {/* Advantages - предимствата на агенцията */}
      <Advantages />

      {/* Топ Дестинации */}
      <TopDestinations />

      {/* Слагаме ToursGrid в Suspense. 
        Така, ако има някакво леко забавяне при филтрирането, 
        потребителят ще види красив скелет (fallback), вместо да му "забие" страницата.
      */}
      <Suspense fallback={
        <div className="container mx-auto px-4 py-20 flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-gold"></div>
        </div>
      }>
        <ToursGrid initialTours={tours} />
      </Suspense>

      {/* Отзиви от клиенти */}
      <Testimonials />
    </main>
  );
}