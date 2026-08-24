"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, MapPin, Star } from "lucide-react";
import { ITour } from "@/types";
import Badge from "@/components/ui/Badge";
import { formatPrice } from "@/lib/formatPrice";
import { BLUR_PLACEHOLDER } from "@/lib/blurPlaceholder";
import { isOperatorHotlink } from "@/lib/operatorImageDomains";

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

// Cursor-reactive tilt (2026 spatial-UI touch) — reset respects prefers-reduced-motion via CSS
function handleTiltMove(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width - 0.5;
  const py = (e.clientY - rect.top) / rect.height - 0.5;
  el.style.setProperty('--ry', `${px * 6}deg`);
  el.style.setProperty('--rx', `${-py * 6}deg`);
}
function handleTiltLeave(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.style.setProperty('--rx', '0deg');
  el.style.setProperty('--ry', '0deg');
}

export default function FeaturedTours({ tours }: FeaturedToursProps) {
  const featured = pickFeatured(tours);
  if (featured.length === 0) return null;

  const [lead, ...rest] = featured;

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

        {/* Bento — един голям водещ тур + два компактни, вместо еднакви 3 карти */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-6 items-stretch">

          {/* Водещ тур — голяма карта с cursor-tilt (2026 spatial-UI акцент) */}
          {(() => {
            const tour = lead;
            const isConfirmed = tour.groupStatus === "confirmed";
            const isLedByPoli = tour.categories?.includes("Водена от ПОЛИ");
            const slug = tour.slug || tour.tourId || tour.id;
            const country = Array.isArray(tour.country) ? tour.country.join(", ") : tour.country;
            const date = displayDate(tour.date);

            return (
              <Link
                href={`/tour/${slug}`}
                onMouseMove={handleTiltMove}
                onMouseLeave={handleTiltLeave}
                className={`tilt-card group relative bg-white rounded-[2rem] overflow-hidden flex flex-col shadow-sm hover:shadow-2xl transition-shadow duration-500 border lg:col-span-3 ${
                  isConfirmed
                    ? "border-brand-gold/40 shadow-[0_0_20px_rgba(197,163,93,0.15)]"
                    : "border-gray-100"
                }`}
              >
                {/* Снимка */}
                <div className="relative h-72 md:h-96 overflow-hidden bg-brand-dark flex-shrink-0">
                  {tour.img && !isOperatorHotlink(tour.img) ? (
                    <Image
                      src={tour.img}
                      alt={tour.title}
                      fill
                      placeholder="blur"
                      blurDataURL={BLUR_PLACEHOLDER}
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      priority
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-dark to-brand-dark/60">
                      <span className="text-6xl font-serif italic text-brand-gold/20">
                        {country?.charAt(0) || "?"}
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                  {/* Топ избор */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2 items-start z-10">
                    <span className="glass-panel text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full text-white">
                      ✦ Топ избор
                    </span>
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
                    {isLedByPoli && <Badge variant="poli" />}
                  </div>

                  {/* Съдържание върху снимката — по-editorial усещане */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7 flex items-end justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-brand-gold text-[10px] font-black uppercase tracking-widest mb-2">
                        <MapPin size={11} />
                        <span>{country}</span>
                      </div>
                      <h3 className="font-serif font-bold text-white text-2xl md:text-3xl leading-tight mb-2 group-hover:text-brand-gold transition-colors">
                        {tour.title}
                      </h3>
                      {date && (
                        <div className="flex items-center gap-2 text-white/70 text-xs font-bold">
                          <Calendar size={13} className="text-brand-gold" />
                          <span>{date}</span>
                        </div>
                      )}
                    </div>
                    <div className="glass-panel shrink-0 px-4 py-3 rounded-2xl text-center">
                      <p className="text-[9px] font-black text-white/60 uppercase tracking-widest leading-none mb-1">
                        Цена от
                      </p>
                      <p className="text-brand-gold font-serif font-bold text-xl leading-none">{formatPrice(tour.price)}</p>
                    </div>
                  </div>
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
          })()}

          {/* Компактни карти вдясно — хоризонтален magazine-style layout */}
          <div className="flex flex-col gap-5 lg:gap-6 lg:col-span-2">
            {rest.map((tour) => {
              const isConfirmed = tour.groupStatus === "confirmed";
              const isLedByPoli = tour.categories?.includes("Водена от ПОЛИ");
              const slug = tour.slug || tour.tourId || tour.id;
              const country = Array.isArray(tour.country) ? tour.country.join(", ") : tour.country;
              const date = displayDate(tour.date);

              return (
                <Link
                  key={tour.id}
                  href={`/tour/${slug}`}
                  className={`group relative bg-white rounded-[1.75rem] overflow-hidden flex flex-row shadow-sm hover:shadow-xl transition-all duration-500 border flex-1 ${
                    isConfirmed
                      ? "border-brand-gold/40 shadow-[0_0_20px_rgba(197,163,93,0.15)]"
                      : "border-gray-100"
                  }`}
                >
                  {/* Снимка */}
                  <div className="relative w-2/5 min-h-[9rem] overflow-hidden bg-brand-dark flex-shrink-0">
                    {tour.img && !isOperatorHotlink(tour.img) ? (
                      <Image
                        src={tour.img}
                        alt={tour.title}
                        fill
                        placeholder="blur"
                        blurDataURL={BLUR_PLACEHOLDER}
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes="(max-width: 1024px) 40vw, 20vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-dark to-brand-dark/60">
                        <span className="text-3xl font-serif italic text-brand-gold/20">
                          {country?.charAt(0) || "?"}
                        </span>
                      </div>
                    )}
                    {isLedByPoli && (
                      <div className="absolute bottom-2 right-2 z-10 scale-75 origin-bottom-right">
                        <Badge variant="poli" />
                      </div>
                    )}
                  </div>

                  {/* Съдържание */}
                  <div className="w-3/5 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-brand-gold text-[9px] font-black uppercase tracking-widest mb-1.5">
                        <MapPin size={10} />
                        <span className="truncate">{country}</span>
                      </div>
                      <h3 className="font-serif font-bold text-brand-dark text-sm leading-snug mb-1.5 group-hover:text-brand-gold transition-colors line-clamp-2">
                        {tour.title}
                      </h3>
                      {(tour.groupStatus === "last-places" || tour.groupStatus === "active") && (
                        <span
                          className={`inline-block text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                            tour.groupStatus === "last-places" ? "bg-rose-600 text-white" : "bg-brand-gold/90 text-brand-dark"
                          }`}
                        >
                          {tour.groupStatus === "last-places" ? "Последни места" : "Оформяща група"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-end justify-between pt-2 mt-auto border-t border-gray-50">
                      <div>
                        {date && <p className="text-[10px] text-gray-400 font-bold mb-0.5">{date}</p>}
                        <p className="text-brand-gold font-serif font-bold text-base leading-none">{formatPrice(tour.price)}</p>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-brand-gold/10 group-hover:bg-brand-gold flex items-center justify-center transition-colors shrink-0">
                        <ArrowRight size={12} className="text-brand-gold group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
