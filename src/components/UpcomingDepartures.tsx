"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ITour } from "@/types";
import {
  Calendar, MapPin, ChevronLeft, ChevronRight,
  Flame, CheckCircle2, Clock, AlertCircle
} from "lucide-react";

interface UpcomingDeparturesProps {
  tours: ITour[];
}

interface Departure {
  tour: ITour;
  date: string;
  daysUntil: number;
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  if (raw.includes(".")) {
    const [d, m, y] = raw.split(".");
    if (d && m && y) return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split("-");
    return new Date(`${y}-${m}-${d}`);
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function daysFromNow(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("bg-BG", { day: "numeric", month: "long" });
}

export default function UpcomingDepartures({ tours }: UpcomingDeparturesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const departures = useMemo<Departure[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result: Departure[] = [];

    tours.forEach((tour) => {
      if (tour.status !== "public") return;
      if (tour.groupStatus === "sold-out") return;

      const allRaw: string[] = [
        ...(tour.dates || []),
        ...(tour.date ? [tour.date] : []),
      ];

      const seen = new Set<string>();
      allRaw.forEach((raw) => {
        const parsed = parseDate(raw);
        if (!parsed) return;
        parsed.setHours(0, 0, 0, 0);
        if (parsed < today) return;
        const iso = parsed.toISOString().split("T")[0];
        if (seen.has(iso)) return;
        seen.add(iso);
        result.push({ tour, date: iso, daysUntil: daysFromNow(parsed) });
      });
    });

    result.sort((a, b) => a.daysUntil - b.daysUntil);
    return result.slice(0, 8);
  }, [tours]);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 280 : -280, behavior: "smooth" });
  };

  if (!departures.length) return null;

  return (
    <section className="bg-brand-dark overflow-hidden relative">
      <div className="h-px bg-gradient-to-r from-transparent via-brand-gold to-transparent" />

      <div className="py-5 md:py-6">
        <div className="container mx-auto px-6 flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-gold" />
            </span>
            <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.3em]">
              Предстоящи заминавания
            </span>
            <div className="hidden md:block h-px w-12 bg-brand-gold/30" />
            <span className="hidden md:block text-white/30 text-xs font-medium">
              {departures.length} предстоящи дати
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => scroll("left")} disabled={!canLeft} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-brand-gold transition-all disabled:opacity-20 disabled:cursor-not-allowed">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => scroll("right")} disabled={!canRight} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-brand-gold transition-all disabled:opacity-20 disabled:cursor-not-allowed">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-3 overflow-x-auto px-6 pb-1 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {departures.map(({ tour, date, daysUntil }, i) => {
            const isUrgent = daysUntil <= 14;
            const isLastPlaces = tour.groupStatus === "last-places";
            const isConfirmed = tour.groupStatus === "confirmed";
            const country = Array.isArray(tour.country) ? tour.country[0] : tour.country;
            const slug = tour.slug || tour.tourId || tour.id;
            const hasPoliLabel = tour.categories?.includes("Водена от ПОЛИ");

            return (
              <Link
                key={`${tour.id}-${date}-${i}`}
                href={`/tour/${slug}`}
                className={`flex-shrink-0 w-[240px] md:w-[260px] group relative rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 ${
                  isLastPlaces
                    ? "border-amber-500/40 bg-amber-900/20 hover:border-amber-400"
                    : isUrgent
                    ? "border-red-500/30 bg-red-950/20 hover:border-red-400"
                    : "border-white/8 bg-white/5 hover:border-brand-gold/50"
                }`}
              >
                <div className="absolute -top-2 left-3 z-10">
                  {isLastPlaces && (
                    <span className="flex items-center gap-1 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                      <Flame size={9} />
                      {tour.spotsLeft
                        ? `Остават само ${tour.spotsLeft} ${tour.spotsLeft === 1 ? 'място' : 'места'}`
                        : 'Последни места'}
                    </span>
                  )}
                  {!isLastPlaces && isUrgent && daysUntil <= 7 && (
                    <span className="flex items-center gap-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                      <AlertCircle size={9} /> {daysUntil === 0 ? "Днес!" : `${daysUntil} дни`}
                    </span>
                  )}
                  {isConfirmed && !isLastPlaces && (
                    <span className="flex items-center gap-1 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                      <CheckCircle2 size={9} /> Потвърдена
                    </span>
                  )}
                </div>

                <div className="p-4 pt-5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <MapPin size={11} className="text-brand-gold shrink-0" />
                    <span className="text-brand-gold text-[10px] font-black uppercase tracking-wider truncate">{country}</span>
                    {hasPoliLabel && (
                      <span className="ml-auto text-[8px] font-black text-brand-gold/60 uppercase tracking-wider shrink-0">★ Поли</span>
                    )}
                  </div>

                  <h3 className="text-white text-sm font-bold leading-snug mb-3 line-clamp-2 group-hover:text-brand-gold transition-colors">
                    {tour.title}
                  </h3>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/8">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={11} className="text-white/40 shrink-0" />
                      <span className="text-white/70 text-xs font-medium">
                        {mounted ? formatDisplayDate(date) : date}
                      </span>
                    </div>
                    <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${
                      daysUntil <= 7 ? "bg-red-500/20 text-red-400"
                        : daysUntil <= 30 ? "bg-amber-500/15 text-amber-400"
                        : "bg-white/8 text-white/40"
                    }`}>
                      <Clock size={9} />
                      {daysUntil === 0 ? "Днес" : daysUntil === 1 ? "Утре" : `${daysUntil}д.`}
                    </div>
                  </div>

                  {(tour.discountPrice || tour.price) && (
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-[10px] text-white/30 font-medium">от</span>
                      {tour.discountPrice ? (
                        <>
                          <span className="text-white/30 text-xs line-through">{tour.price}</span>
                          <span className="text-red-400 text-sm font-black">{tour.discountPrice}</span>
                        </>
                      ) : (
                        <span className="text-white font-black text-sm">{tour.price}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full bg-brand-gold/0 group-hover:bg-brand-gold flex items-center justify-center transition-all">
                  <ChevronRight size={12} className="text-brand-gold group-hover:text-brand-dark transition-colors" />
                </div>
              </Link>
            );
          })}

          <Link
            href="/#tours-grid"
            className="flex-shrink-0 w-[160px] flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 text-white/30 hover:text-brand-gold hover:border-brand-gold/40 transition-all p-4 text-center group"
          >
            <div className="w-8 h-8 rounded-full border border-white/15 group-hover:border-brand-gold flex items-center justify-center transition-colors">
              <ChevronRight size={16} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider leading-tight">Всички оферти</span>
          </Link>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-brand-gold/30 to-transparent" />
    </section>
  );
}
