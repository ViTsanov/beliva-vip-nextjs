"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, MapPin, Star } from "lucide-react";
import { ITour } from "@/types";
import Badge from "@/components/ui/Badge";

interface FeaturedToursProps {
  tours: ITour[];
}

// Нормализира дата до ISO string за сортиране
function normDate(d: any): string {
  if (!d) return "";
  if (typeof d === "object" && d.seconds) return new Date(d.seconds * 1000).toISOString().split("T")[0];
  const str = String(d).trim().split("T")[0];
  const sep = str.includes("-") ? "-" : str.includes("/") ? "/" : str.includes(".") ? "." : null;
  if (!sep) return "";
  const parts = str.split(sep);
  if (parts.length !== 3) return "";
  const [a, b, c] = parts;
  if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
  if (c.length === 4) return `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  return "";
}

function displayDate(d: any): string {
  const iso = normDate(d);
  if (!iso) return "";
  return iso.split("-").reverse().join(".");
}

// Избира топ 3 тура: потвърдени → Поли → дата
function pickFeatured(tours: ITour[]): ITour[] {
  const now = new Date().toISOString().split("T")[0];
  return [...tours]
    .filter((t) => t.groupStatus !== "sold-out" && t.status === "public")
    .sort((a, b) => {
      const score = (t: ITour) =>
        (t.groupStatus === "confirmed" ? 4 : t.groupStatus === "last-places" ? 3 : t.groupStatus === "active" ? 1 : 0) +
        (t.categories?.includes("Водена от ПОЛИ") ? 2 : 0);
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
      const da = normDate(a.date) || "9999";
      const db_ = normDate(b.date) || "9999";
      return da < db_ ? -1 : da > db_ ? 1 : 0;
    })
    .slice(0, 3);
}

export default function FeaturedTours({ tours }: FeaturedToursProps) {
  const featured = pickFeatured(tours);
  if (featured.length === 0) return null;

  return (
    <section className="bg-white py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 md:mb-10">
          <div>
            <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.3em] block mb-2">
              Горещи предложения
            </span>
            <h2 className="text-3xl md:text-4xl font-serif italic text-brand-dark leading-tight">
              Топ <span className="text-brand-gold">3</span> екскурзии
            </h2>
          </div>
          <Link
            href="#tours-grid"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("tours-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="inline-flex items-center gap-2 text-brand-dark font-black uppercase text-[10px] tracking-widest border-b border-brand-gold/40 pb-0.5 hover:border-brand-gold hover:text-brand-gold transition-all group shrink-0"
          >
            Виж всички
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* 3 карти */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {featured.map((tour, idx) => {
            const isConfirmed = tour.groupStatus === "confirmed";
            const isLedByPoli = tour.categories?.includes("Водена от ПОЛИ");
            const slug = tour.slug || tour.tourId || tour.id;
            const country = Array.isArray(tour.country) ? tour.country.join(", ") : tour.country;
            const date = displayDate(tour.date);

            return (
              <Link
                key={tour.id}
                href={`/tour/${slug}`}
                className={`group relative bg-white rounded-[2rem] overflow-hidden flex flex-col shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border ${
                  isConfirmed
                    ? "border-brand-gold/40 shadow-[0_0_20px_rgba(197,163,93,0.15)]"
                    : "border-gray-100"
                }`}
              >
                {/* Снимка */}
                <div className="relative h-56 md:h-60 overflow-hidden bg-brand-dark flex-shrink-0">
                  {tour.img ? (
                    <Image
                      src={tour.img}
                      alt={tour.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      priority={idx === 0}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-dark to-brand-dark/60">
                      <span className="text-6xl font-serif italic text-brand-gold/20">
                        {country?.charAt(0) || "?"}
                      </span>
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Badges горе вляво */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2 items-start z-10">
                    {isConfirmed && <Badge variant="groupStatus" />}
                    {tour.groupStatus === "last-places" && (
                      <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-rose-600 text-white shadow-md">
                        Последни места
                      </span>
                    )}
                    {tour.groupStatus === "active" && (
                      <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-brand-gold text-brand-dark shadow-md">
                        Оформяща група
                      </span>
                    )}
                  </div>

                  {/* Поли badge долу вдясно */}
                  {isLedByPoli && (
                    <div className="absolute bottom-4 right-4 z-10">
                      <Badge variant="poli" />
                    </div>
                  )}

                  {/* Цена долу вляво */}
                  <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-xl shadow-lg border border-brand-gold/10">
                    <p className="text-[9px] font-black text-brand-dark/50 uppercase tracking-widest leading-none mb-0.5">
                      Цена от
                    </p>
                    <p className="text-brand-gold font-serif font-bold text-lg leading-none">{tour.price}</p>
                  </div>
                </div>

                {/* Съдържание */}
                <div className="p-5 flex flex-col grow">
                  {/* Дестинация */}
                  <div className="flex items-center gap-1.5 text-brand-gold text-[10px] font-black uppercase tracking-widest mb-2">
                    <MapPin size={11} />
                    <span>{country}</span>
                  </div>

                  {/* Заглавие */}
                  <h3 className="font-serif font-bold text-brand-dark text-lg leading-snug mb-3 group-hover:text-brand-gold transition-colors line-clamp-2">
                    {tour.title}
                  </h3>

                  {/* Дата */}
                  {date && (
                    <div className="mt-auto flex items-center gap-2 text-gray-400 text-xs font-bold pt-3 border-t border-gray-50">
                      <Calendar size={13} className="text-brand-gold" />
                      <span>{date}</span>
                    </div>
                  )}
                </div>

                {/* CTA лента */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between group-hover:bg-brand-dark transition-colors duration-300">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-dark group-hover:text-brand-gold transition-colors">
                    Виж програмата
                  </span>
                  <div className="w-7 h-7 rounded-full bg-brand-dark/5 group-hover:bg-brand-gold flex items-center justify-center transition-colors">
                    <ArrowRight size={14} className="text-brand-dark group-hover:text-brand-dark transition-colors" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </section>
  );
}
