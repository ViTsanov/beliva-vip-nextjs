import { getActiveTours } from "@/services/tourService";
import ToursGrid from "@/components/sections/ToursGrid";
import { slugify } from "@/lib/admin-helpers";
import { WORLD_COUNTRIES } from "@/lib/constants";
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, ArrowLeft, Globe, Compass, ChevronDown } from 'lucide-react'; // Добавихме ChevronDown
import ScrollToToursButton from "@/components/ui/ScrollToToursButton";

export const revalidate = 3600;

type Props = { params: Promise<{ country: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const countryName = WORLD_COUNTRIES.find(c => slugify(c) === resolvedParams.country) || resolvedParams.country;
  return {
    title: `Екскурзии до ${countryName} 2025/2026 | Beliva VIP`,
    description: `Открийте най-добрите оферти за ${countryName}. Всички групи са с водач и внимателно подбран маршрут.`,
  };
}

export default async function DestinationPage({ params }: Props) {
  const resolvedParams = await params;
  const countrySlug = resolvedParams.country;
  const allTours = await getActiveTours();

  const destinationTours = allTours.filter(tour => {
     const tourCountries = typeof tour.country === 'string' 
        ? tour.country.split(',').map(c => c.trim()) 
        : (Array.isArray(tour.country) ? tour.country : []);
     return tourCountries.some(c => slugify(c) === countrySlug);
  });

  if (destinationTours.length === 0) notFound();

  const countryName = WORLD_COUNTRIES.find(c => slugify(c) === countrySlug) || countrySlug;
  const heroImg = destinationTours[0]?.img || '/hero/hero-bg.webp';

  const tempDescription = `Изживейте магията на ${countryName} с Beliva VIP. От екзотични пейзажи и скрити съкровища до богата история и кулинарни приключения – всяко наше пътуване е внимателно планирано, за да ви предложи автентичност и комфорт. Нашите групи са малки, а водачите ни познават дестинацията в детайли.`;

  return (
    <main className="min-h-screen bg-brand-light scroll-smooth">
      
      {/* 1. ГИГАНТСКО HERO */}
      <div className="relative w-full h-[70vh] min-h-[600px] overflow-hidden">
        <Image src={heroImg} alt={countryName} fill className="object-cover scale-105 animate-slow-zoom" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-brand-light"></div>
        
        <Link href="/" className="absolute top-32 left-8 z-30 flex items-center gap-2 text-white/80 hover:text-white transition-colors group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Назад към всички</span>
        </Link>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pt-20">
           <div className="flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="h-[1px] w-12 bg-brand-gold"></div>
              <span className="text-brand-gold text-sm font-black uppercase tracking-[0.3em]">Destination Guide</span>
              <div className="h-[1px] w-12 bg-brand-gold"></div>
           </div>
           <h1 className="text-6xl md:text-8xl lg:text-9xl font-serif italic text-white drop-shadow-2xl mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
             {countryName}
           </h1>
        </div>
      </div>

      {/* 2. ТЕКСТОВА СЕКЦИЯ С БУТОН ЗА СКРОЛ */}
      <div className="container mx-auto px-6 -mt-32 relative z-20">
        <div className="max-w-4xl mx-auto bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl border border-brand-gold/10">
          
          {/* 👇 НОВИЯТ БУТОН "КЪМ ЕКСКУРЗИИТЕ" 👇 */}
          {/* ВЕЧЕ ИЗПОЛЗВАМЕ CLIENT COMPONENT ЗА ПЛАВЕН СКРОЛ */}
            <ScrollToToursButton targetId="tours-list" label="Към екскурзиите" />

          <div className="flex flex-col md:flex-row gap-10 items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-brand-gold mb-6">
                <Compass size={24} />
                <span className="font-bold uppercase tracking-widest text-xs">Защо да изберете {countryName}?</span>
              </div>
              <p className="text-xl md:text-2xl font-serif text-brand-dark leading-relaxed italic opacity-90">
                "{tempDescription}"
              </p>
            </div>
            
            <div className="w-full md:w-px h-px md:h-40 bg-brand-gold/20 self-center"></div>
            
            <div className="flex flex-col gap-4 min-w-[150px]">
              <div className="text-center">
                <p className="text-4xl font-serif text-brand-gold leading-none">{destinationTours.length}</p>
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-tighter mt-1">Оферти</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-serif text-brand-gold leading-none">100%</p>
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-tighter mt-1">Гаранция</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. РЕЗУЛТАТИ (С добавено ID за скрола) */}
      <div id="tours-list" className="py-20 scroll-mt-20 relative">
        <ToursGrid initialTours={destinationTours} hideFilters={true} />
      </div>

      {/* 4. ДОЛЕН БУТОН */}
      <div className="container mx-auto px-6 pb-32 text-center">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-brand-gold/30 to-transparent mb-16"></div>
        <h3 className="text-2xl font-serif text-brand-dark mb-8 opacity-70">Искате да откриете още светове?</h3>
        <Link 
          href="/#tours-grid" 
          className="inline-flex items-center gap-4 bg-brand-dark text-white px-10 py-5 rounded-full font-bold uppercase tracking-[0.2em] text-xs hover:bg-brand-gold transition-all shadow-xl hover:shadow-brand-gold/20 group"
        >
          <Globe size={18} className="group-hover:rotate-12 transition-transform" />
          Разгледайте всички дестинации
        </Link>
      </div>

    </main>
  );
}