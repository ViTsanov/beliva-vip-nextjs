import Hero from "@/components/sections/Hero";
import ToursGrid from "@/components/sections/ToursGrid";
import TopDestinations from "@/components/TopDestinations";
import MeetGuides from "@/components/MeetGuides";
import Testimonials from "@/components/Testimonials";
import { Suspense } from "react";
import { getActiveTours, getTopDestinationsConfig } from "@/services/tourService";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://belivavip.bg',
  },
};

export default async function HomePage() {
  const [tours, topDestinations] = await Promise.all([
    getActiveTours(),
    getTopDestinationsConfig(),
  ]);

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

      <MeetGuides />

      {/* Топ Дестинации */}
      <TopDestinations initialDestinations={topDestinations} counts={destinationCounts} />

      {/* Запознайте се с Поли и Ива */}
      

      {/* Всички турове */}
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
