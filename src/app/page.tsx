import Hero from "@/components/sections/Hero";
import PoliIntro from "@/components/sections/PoliIntro";
import ToursGrid from "@/components/sections/ToursGrid";
import FeaturedTours from "@/components/FeaturedTours";
import MeetGuides from "@/components/MeetGuides";
import { LazyTestimonials } from "@/components/LazyClient";
import CTASection from "@/components/sections/CTASection";
import DestinationsSection from "@/components/sections/DestinationsSection";
import { Suspense } from "react";
import { getActiveTours } from "@/services/tourService";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { Metadata } from "next";

export const revalidate = 120;

export const metadata: Metadata = {
  alternates: {
    canonical: "https://belivavip.bg",
  },
};

export default async function HomePage() {
  const tours = await getActiveTours();

  let destinationsSectionCountries: string[] = [];
  let destinationsSectionImages: Record<string, string> = {};
  try {
    const settingsSnap = await getDoc(doc(db, "settings", "homepage"));
    if (settingsSnap.exists()) {
      destinationsSectionCountries = settingsSnap.data().destinationsSectionCountries || [];
      destinationsSectionImages = settingsSnap.data().destinationsSectionImages || {};
    }
  } catch (e) {
    console.error("Грешка при изтегляне на homepage настройки:", e);
  }

  // Изчисляваме „днешна дата“ веднъж тук, на сървъра, и я предаваме като prop надолу —
  // иначе ToursGrid щеше вика new Date() сама, и тъй като това е client component, рендиран
  // и на сървъра, и при хидратация на клиента, двата могат да хванат различни моменти и да дадат
  // различен списък турове → хидратационна грешка.
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <>

      {/* 1. Херо */}
      <Hero />

      {/* 1.5 Цитатът за залеза + кратко представяне на Поли; подробната секция за нея е по-долу (MeetGuides) */}
      <PoliIntro />

      {/* 2. Топ 3 екскурзии — веднага след героса */}
      <FeaturedTours tours={tours} todayStr={todayStr} />

      {/* 3. Дестинации */}
      <DestinationsSection tours={tours} adminCountries={destinationsSectionCountries} adminImages={destinationsSectionImages} />

      {/* 4. Всички предложения */}
      <Suspense
        fallback={
          <div className="container mx-auto px-4 py-20 flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-gold" />
          </div>
        }
      >
        <ToursGrid initialTours={tours} todayStr={todayStr} />
      </Suspense>

      {/* 5. Коя е Поли */}
      <MeetGuides />

      {/* 6. Ревюта */}
      <LazyTestimonials />

      {/* 7. CTA — покана за запитване */}
      <CTASection />

    </>
  );
}
