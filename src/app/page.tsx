import Hero from "@/components/sections/Hero";
import ToursGrid from "@/components/sections/ToursGrid";
import TopDestinations from "@/components/TopDestinations";
import Advantages from "@/components/Advantages";
import Testimonials from "@/components/Testimonials";
import { Suspense } from "react";
import { getActiveTours, getTopDestinationsConfig } from "@/services/tourService";
import type { Metadata } from "next";

export const revalidate = 3600;

// Canonical on homepage prevents /?country=X and /?continent=Y
// from being indexed as separate pages by Google
export const metadata: Metadata = {
  alternates: {
    canonical: 'https://belivavip.bg',
  },
}; 

export default async function HomePage() {
  // Fetch both in parallel to avoid waterfall
  const [tours, topDestinations] = await Promise.all([
    getActiveTours(),
    getTopDestinationsConfig(),
  ]);

  // Pre-compute destination counts server-side so TopDestinations renders immediately
  const destinationCounts: Record<string, number> = {};
  tours.forEach(tour => {
    const countries = Array.isArray(tour.country)
      ? tour.country
      : (typeof tour.country === 'string' ? tour.country.split(',').map((c: string) => c.trim()) : []);
    countries.forEach((c: string) => {
      if (c) destinationCounts[c] = (destinationCounts[c] || 0) + 1;
    });
  });

  return (
    <main className="min-h-screen bg-brand-light">
      <Hero />
      
      {/* Advantages - предимствата на агенцията */}
      <Advantages />

      {/* Топ Дестинации - данните са предварително изтеглени от сървъра */}
      <TopDestinations initialDestinations={topDestinations} counts={destinationCounts} />

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