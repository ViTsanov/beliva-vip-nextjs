import Hero from "@/components/sections/Hero";
import HeroClassic from "@/components/sections/HeroClassic";
import PoliIntro from "@/components/sections/PoliIntro";
import ToursGrid from "@/components/sections/ToursGrid";
import FeaturedTours from "@/components/FeaturedTours";
import MeetGuides from "@/components/MeetGuides";
import { LazyTestimonials } from "@/components/LazyClient";
import CTASection from "@/components/sections/CTASection";
import DestinationsSection from "@/components/sections/DestinationsSection";
import { getActiveTours, toTourSummary } from "@/services/tourService";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { Metadata } from "next";
import { homeShareImage, shareMetadata } from "@/lib/shareMeta";

export const revalidate = 120;

export const metadata: Metadata = {
  alternates: {
    canonical: "https://belivavip.bg",
  },
  // Превюто при споделяне — първият слайд на hero-то (Мексико) като JPEG 1200×630 (/og/home.jpg)
  ...shareMetadata({
    path: '/',
    title: "Beliva VIP Tour | Изживейте Изключителното",
    description: "Групови екскурзии с водач до Китай, Япония, Австралия, Нова Зеландия, Перу и още.",
    image: homeShareImage(),
    imageAlt: "Beliva VIP Tour — екскурзии с водач",
  }),
};

export default async function HomePage() {
  // Без програмите, галериите и т.н. — картите не ги показват, а иначе влизат в HTML-а (виж toTourSummary)
  const tours = (await getActiveTours()).map(toTourSummary);

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
      {/* Телефон, таблет и нисък екран — дизайнът отпреди глобуса; широк и висок екран — героса с глобуса.
          И двата са в HTML-а (сървърът не знае размера на екрана), CSS показва единия, а скритият спи. */}
      <div className="lg:[@media(min-height:640px)]:hidden">
        <HeroClassic />
      </div>
      <div className="hidden lg:[@media(min-height:640px)]:block">
        <Hero />
      </div>

      {/* 1.5 Цитатът за залеза + кратко представяне на Поли; подробната секция за нея е по-долу (MeetGuides) */}
      <PoliIntro />

      {/* 2. Топ 3 екскурзии — веднага след героса */}
      <FeaturedTours tours={tours} todayStr={todayStr} />

      {/* 3. Дестинации */}
      <DestinationsSection tours={tours} adminCountries={destinationsSectionCountries} adminImages={destinationsSectionImages} />

      {/* 4. Всички предложения — рендира се на сървъра (параметрите от адреса чете вътре, в собствен Suspense) */}
      <ToursGrid initialTours={tours} todayStr={todayStr} />

      {/* 5. Коя е Поли */}
      <MeetGuides />

      {/* 6. Ревюта */}
      <LazyTestimonials />

      {/* 7. CTA — покана за запитване */}
      <CTASection />

    </>
  );
}
