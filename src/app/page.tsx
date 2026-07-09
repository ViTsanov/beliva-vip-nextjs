import Hero from "@/components/sections/Hero";
import ToursGrid from "@/components/sections/ToursGrid";
import FeaturedTours from "@/components/FeaturedTours";
import MeetGuides from "@/components/MeetGuides";
import Testimonials from "@/components/Testimonials";
import { Suspense } from "react";
import { getActiveTours } from "@/services/tourService";
import type { Metadata } from "next";

export const revalidate = 120;

export const metadata: Metadata = {
  alternates: {
    canonical: "https://belivavip.bg",
  },
};

export default async function HomePage() {
  const tours = await getActiveTours();

  return (
    <main className="min-h-screen bg-brand-light">

      {/* 1. Херо */}
      <Hero />

      {/* 2. Топ 3 екскурзии — веднага след героса */}
      <FeaturedTours tours={tours} />

      {/* 3. Всички предложения */}
      <Suspense
        fallback={
          <div className="container mx-auto px-4 py-20 flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-gold" />
          </div>
        }
      >
        <ToursGrid initialTours={tours} />
      </Suspense>

      {/* 4. Коя е Поли */}
      <MeetGuides />

      {/* 5. Ревюта */}
      <Testimonials />

    </main>
  );
}
