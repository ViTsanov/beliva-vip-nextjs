import Image from "next/image";
import Link from "next/link";
import { ITour } from "@/types";
import { Star, ArrowRight, MapPin } from "lucide-react";
import TourCard from "@/components/tours/TourCard";

interface PoliSectionProps {
  poliTours: ITour[];
}

// Thin server wrapper — TourCard is a client component so favorites/toggle need a client shim
// We render a simplified read-only card version here to keep this server-safe
function PoliTourCard({ tour }: { tour: ITour }) {
  const formatDate = (d: string) => d.split("-").reverse().join(".");
  const dates = [
    ...(tour.dates || []),
    ...(tour.date ? [tour.date] : []),
  ].sort().slice(0, 2);

  return (
    <Link
      href={`/tour/${tour.slug || tour.tourId || tour.id}`}
      className="group bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-brand-gold/10 hover:-translate-y-1 flex flex-col"
    >
      <div className="relative h-52 overflow-hidden">
        <Image
          src={tour.img}
          alt={tour.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4">
          <span className="text-[9px] font-black uppercase tracking-widest text-brand-gold flex items-center gap-1">
            <MapPin size={9} />
            {Array.isArray(tour.country) ? tour.country.join(", ") : tour.country}
          </span>
        </div>
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1">
          <Star size={10} className="text-brand-gold fill-brand-gold" />
          <span className="text-[9px] font-black text-brand-dark uppercase tracking-wider">Водена от Поли</span>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-serif font-bold text-brand-dark text-base leading-snug mb-3 group-hover:text-brand-gold transition-colors line-clamp-2">
          {tour.title}
        </h3>
        <div className="mt-auto flex items-center justify-between">
          <div>
            {dates.map((d, i) => (
              <span key={i} className="text-xs font-bold text-brand-dark block">
                {formatDate(d)}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-brand-gold text-lg">{tour.price}</span>
            <div className="w-8 h-8 rounded-full bg-brand-gold/10 flex items-center justify-center group-hover:bg-brand-gold group-hover:text-white transition-all">
              <ArrowRight size={14} className="text-brand-gold group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function PoliSection({ poliTours }: PoliSectionProps) {
  if (poliTours.length === 0) return null;

  return (
    <section className="py-20 bg-[#f7f4ee] relative overflow-hidden">
      {/* Decorative background letter */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center pointer-events-none select-none overflow-hidden">
        <span className="text-[22rem] font-serif italic font-bold text-brand-dark/[0.025] leading-none translate-x-20">
          П
        </span>
      </div>

      <div className="container mx-auto px-6 relative z-10">

        {/* Section label */}
        <div className="flex items-center gap-4 mb-16">
          <div className="h-px w-10 bg-brand-gold" />
          <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.3em]">
            Вашият водач
          </span>
        </div>

        {/* Main grid: photo left, info right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-20">

          {/* Photo — 4 cols */}
          <div className="lg:col-span-4">
            <div className="relative rounded-[3rem] overflow-hidden aspect-[3/4] shadow-2xl border-4 border-white">
              {/* Placeholder — replace src with Poly's actual photo */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand-dark to-brand-dark/80 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full bg-brand-gold/20 border-4 border-brand-gold/30 flex items-center justify-center mx-auto mb-4">
                    <span className="text-6xl font-serif font-bold text-brand-gold">П</span>
                  </div>
                  <p className="text-white/40 text-xs font-medium uppercase tracking-widest">снимка на Поли</p>
                </div>
              </div>
              {/* Uncomment and set src when you have Poly's photo:
              <Image
                src="/team/poli.jpg"
                alt="Паулина - водач на Beliva VIP Tour"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 33vw"
              />
              */}

              {/* Gold badge bottom */}
              <div className="absolute bottom-6 left-6 right-6 bg-brand-dark/80 backdrop-blur-md rounded-2xl p-4 border border-brand-gold/20">
                <div className="flex items-center gap-3">
                  <Star size={16} className="text-brand-gold fill-brand-gold shrink-0" />
                  <div>
                    <p className="text-white font-bold text-sm leading-none">Паулина</p>
                    <p className="text-brand-gold/70 text-[10px] font-medium mt-0.5 uppercase tracking-wider">
                      Основател & Водач
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info — 8 cols */}
          <div className="lg:col-span-8 lg:pt-4">
            <h2 className="text-5xl md:text-6xl font-serif italic text-brand-dark leading-[1.05] mb-6">
              Водена от <span className="text-brand-gold">Поли</span>
            </h2>

            <p className="text-gray-500 text-lg leading-relaxed font-light mb-6 max-w-xl">
              Поли не просто организира пътувания — тя ги води лично. С над 15 години в туризма
              и стотици водени групи из целия свят, всяка нейна екскурзия е внимателно подбрана,
              лично преживяна и разказана с душа.
            </p>

            <p className="text-gray-500 text-lg leading-relaxed font-light mb-10 max-w-xl">
              Японските храмове, австралийският Outback, перуанските Анди — Поли ги познава
              отвътре, не от брошури. Затова клиентите й се връщат пътуване след пътуване.
            </p>

            {/* Quick facts */}
            <div className="grid grid-cols-3 gap-4 mb-10">
              {[
                { num: "15+", lbl: "години опит" },
                { num: `${poliTours.length}`, lbl: "активни тура" },
                { num: "★ 4.9", lbl: "средна оценка" },
              ].map(({ num, lbl }) => (
                <div key={lbl} className="bg-white rounded-2xl p-4 border border-brand-gold/10 text-center shadow-sm">
                  <div className="text-2xl font-serif font-bold text-brand-gold leading-none mb-1">{num}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{lbl}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/about-us"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-dark text-white rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-brand-gold hover:text-brand-dark transition-all shadow-lg"
              >
                Запознайте се с Поли
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>

        {/* Poli's tours */}
        <div className="border-t border-brand-gold/15 pt-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.3em] block mb-1">
                Лично подбрани
              </span>
              <h3 className="text-3xl font-serif italic text-brand-dark">
                Турове с Поли
              </h3>
            </div>
            <Link
              href="/?cat=Водена+от+ПОЛИ#tours-grid"
              className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-gold hover:text-brand-dark transition-colors"
            >
              Вижте всички
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {poliTours.slice(0, 3).map(tour => (
              <PoliTourCard key={tour.id} tour={tour} />
            ))}
          </div>

          <div className="flex justify-center mt-8 md:hidden">
            <Link
              href="/?cat=Водена+от+ПОЛИ#tours-grid"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-dark text-white rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-brand-gold hover:text-brand-dark transition-all"
            >
              Всички турове с Поли
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
