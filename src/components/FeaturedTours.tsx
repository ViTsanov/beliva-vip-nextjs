"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock, MapPin, AlertTriangle, Heart } from "lucide-react";
import { ITour } from "@/types";
import Badge from "@/components/ui/Badge";
import { RevealGroup } from "@/components/ui/Reveal";
import { formatPrice } from "@/lib/formatPrice";
import { isOperatorHotlink } from "@/lib/operatorImageDomains";
import { useFavoriteTours } from "@/lib/favoriteTours";

interface FeaturedToursProps {
  tours: ITour[];
  // „Днешна дата“ идва от сървъра (page.tsx) — иначе сървърът и клиентът може да изберат различни дати → хидратационна грешка.
  todayStr: string;
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

const displayDate = (iso: string) => iso.split("-").reverse().join(".");

// Предстоящите дати на тура, подредени — първата е „следващото отпътуване“.
function upcomingDates(t: ITour, todayStr: string): string[] {
  const all = [...(t.dates || []), t.date].map(normDate).filter(Boolean);
  return [...new Set(all)].filter((d) => d >= todayStr).sort();
}

// „12 дни / 10 нощувки“ — както в страницата на тура (TourTabs).
function durationLabel(t: ITour): string {
  const days = t.durationDays ? `${t.durationDays} дни` : "";
  const nights = t.nights ? `${t.nights} нощувки` : "";
  if (days && nights) return `${days} / ${nights}`;
  return days || nights || (t.duration ? String(t.duration) : "");
}

// Избира топ 3 тура: потвърдени → последни места → Поли → дата
function pickFeatured(tours: ITour[]): ITour[] {
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

// Топ 3: три еднакви карти, за да се сравняват лесно (дестинация, продължителност, дата, цена).
// На телефон и таблет — хоризонтален ред с плъзгане (следващата карта наднича отстрани), от lg — три колони.
export default function FeaturedTours({ tours, todayStr }: FeaturedToursProps) {
  const featured = pickFeatured(tours);
  if (featured.length === 0) return null;

  return (
    // Появяване при скрол: заглавието, после трите карти една след друга, а снимките леко се отдалечават
    // (.reveal / .reveal-zoom в globals.css; при намалено движение — само избледняване)
    <RevealGroup as="section" aria-labelledby="featured-heading" className="bg-white py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="reveal mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end md:mb-10">
          <div>
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-brand-goldDeep">
              Горещи предложения
            </span>
            <h2 id="featured-heading" className="font-serif text-3xl italic leading-tight text-brand-dark md:text-4xl">
              Топ <span className="text-brand-gold">3</span> екскурзии
            </h2>
          </div>
          <Link
            href="#tours-grid"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("tours-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="group inline-flex min-h-11 shrink-0 items-center gap-2 self-start text-[13px] font-semibold text-brand-dark underline decoration-brand-gold decoration-2 underline-offset-[6px] transition-[text-decoration-color] hover:decoration-brand-dark sm:self-auto"
          >
            Всички екскурзии
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>

        {/* Плъзгащ се ред до lg; от lg — решетка с три равни колони. Отстъпът -mx/px пуска картите до ръба на екрана. */}
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 [scrollbar-width:thin] sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0">
          {featured.map((tour, i) => (
            <li key={tour.id} className="reveal w-[84%] shrink-0 snap-start sm:w-[46%] lg:w-auto" style={{ '--reveal-delay': `${0.12 + i * 0.08}s` } as CSSProperties}>
              <FeaturedCard tour={tour} isTopPick={i === 0} todayStr={todayStr} priority={i === 0} />
            </li>
          ))}
        </ul>
      </div>
    </RevealGroup>
  );
}

function FeaturedCard({ tour, isTopPick, todayStr, priority }: { tour: ITour; isTopPick: boolean; todayStr: string; priority: boolean }) {
  // Снимката се показва плавно, след като се зареди — без „примигване“ от размазания заместител към снимката.
  const [imgLoaded, setImgLoaded] = useState(false);
  // Любими — същият запис като в останалите карти (сърцето в менюто и /favorites се обновяват веднага)
  const { isFavorite, toggle } = useFavoriteTours();
  const favId = tour.tourId || tour.id;
  const isFav = isFavorite(favId);
  // Сърцето „изскача“ само при натискане, не при зареждане
  const [heartPops, setHeartPops] = useState(0);

  const isLedByPoli = !!tour.categories?.includes("Водена от ПОЛИ");
  const slug = tour.slug || tour.tourId || tour.id;
  const country = Array.isArray(tour.country) ? tour.country.join(", ") : tour.country;
  const dates = upcomingDates(tour, todayStr);
  const duration = durationLabel(tour);
  const img = tour.img && !isOperatorHotlink(tour.img) ? tour.img : null;

  // Промоция — същото правило като в TourCard: с кампания важи само в периода ѝ.
  let isPromoActive = !!(tour.isPromo && tour.discountPrice);
  if (tour.campaignId && tour.promoStart && tour.promoEnd) {
    isPromoActive = todayStr >= tour.promoStart.slice(0, 10) && todayStr <= tour.promoEnd.slice(0, 10);
  }

  // relative: картата е опорен блок за sr-only етикетите в цената. Без него те се позиционират спрямо страницата,
  // излизат извън плъзгащия се ред и на телефон правят страницата по-широка от екрана (празно място вдясно).
  // <article> с линк вътре, а не линк около цялата карта — бутонът за любими не може да е вътре в линк.
  return (
    <article
      className={`group relative h-full overflow-hidden rounded-3xl bg-white shadow-[0_10px_24px_-14px_rgba(15,23,42,0.35)] transition-shadow duration-300 hover:shadow-[0_18px_36px_-14px_rgba(15,23,42,0.45)] ${
        isLedByPoli ? "border-2 border-brand-gold" : "border border-slate-200"
      }`}
    >
    <Link
      href={`/tour/${slug}`}
      className="relative flex h-full flex-col rounded-3xl focus-visible:outline focus-visible:outline-[3px] focus-visible:-outline-offset-[3px] focus-visible:outline-brand-dark"
    >
      {/* Снимка */}
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-slate-200">
        {img ? (
          <div className="reveal-zoom absolute inset-0" style={{ '--reveal-delay': '0.12s' } as CSSProperties}>
          <Image
            src={img}
            alt=""
            fill
            priority={priority}
            onLoad={() => setImgLoaded(true)}
            className={`object-cover group-hover:scale-110 ${imgLoaded || priority ? "opacity-100" : "opacity-0"}`}
            style={{ transition: "transform 300ms ease, opacity 500ms ease", objectPosition: tour.imgPosition || "50% 50%" }}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 46vw, 84vw"
          />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-dark">
            <span className="font-serif text-6xl italic text-brand-gold/25" aria-hidden="true">
              {country?.charAt(0) || "?"}
            </span>
          </div>
        )}

        {/* Статус на групата — горе вляво */}
        <div className="absolute left-4 top-4 flex flex-col items-start gap-2">
          {isTopPick && (
            <span className="rounded-full bg-brand-dark/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white">
              ✦ Топ избор
            </span>
          )}
          {tour.groupStatus === "confirmed" && <Badge variant="groupStatus" />}
          {tour.groupStatus === "last-places" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white">
              <AlertTriangle size={11} aria-hidden="true" />
              {tour.spotsLeft ? `Остават ${tour.spotsLeft} ${tour.spotsLeft === 1 ? "място" : "места"}` : "Последни места"}
            </span>
          )}
          {tour.groupStatus === "active" && (
            <span className="rounded-full bg-brand-gold px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-dark">
              Оформяща група
            </span>
          )}
        </div>
        {isLedByPoli && (
          <div className="absolute bottom-3 right-3">
            <Badge variant="poli" />
          </div>
        )}
      </div>

      {/* Бялата част: какво е турът */}
      <div className="flex grow flex-col px-5 pb-5 pt-4">
        <div className="mb-2 flex items-center gap-1.5 text-brand-goldDeep">
          <MapPin size={14} className="shrink-0" aria-hidden="true" />
          <span className="truncate text-[13px] font-bold">{country}</span>
        </div>
        <h3 className="line-clamp-2 min-h-[2.5em] font-serif text-xl font-bold leading-tight text-brand-dark transition-colors group-hover:text-brand-goldDeep">
          {tour.title}
        </h3>
        {duration && (
          <p className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-slate-600">
            <Clock size={14} className="shrink-0" aria-hidden="true" />
            {duration}
          </p>
        )}
      </div>

      {/* Тъмносинята част: кога и колко — двете неща, по които се решава */}
      <div className="flex items-end justify-between gap-3 bg-brand-dark px-5 py-4 text-white">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-white/65">Отпътуване</p>
          <p className="mt-0.5 text-[15px] font-semibold tabular-nums">
            {dates[0] ? (
              <>
                <time dateTime={dates[0]}>{displayDate(dates[0])}</time>
                {dates.length > 1 && <span className="ml-1.5 text-[12px] font-semibold text-white/65">+{dates.length - 1} {dates.length - 1 === 1 ? "дата" : "дати"}</span>}
              </>
            ) : (
              "По запитване"
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-end gap-3">
          <div className="text-right">
            <p className="text-[11px] font-semibold text-white/65">{isPromoActive ? "Промо цена" : "Цена от"}</p>
            {/* Старата цена е на същия ред — така тъмносинята лента е еднакво висока на трите карти */}
            <p className="flex items-baseline justify-end gap-2">
              {isPromoActive && (
                <del className="text-[12px] font-semibold text-white/50">
                  <span className="sr-only">Стандартна цена: </span>
                  {formatPrice(tour.price)}
                </del>
              )}
              <span className="font-serif text-[22px] font-bold leading-none text-brand-gold">
                {isPromoActive && <span className="sr-only">Промоционална цена: </span>}
                {formatPrice(isPromoActive ? tour.discountPrice : tour.price)}
              </span>
            </p>
          </div>
          {/* На телефон стрелката се скрива — цялата карта е линк, а мястото трябва за датата и цената */}
          <span
            aria-hidden="true"
            className="hidden h-10 w-10 items-center justify-center rounded-full sm:flex bg-white/10 text-brand-gold transition-colors duration-200 group-hover:bg-brand-gold group-hover:text-brand-dark"
          >
            <ArrowRight size={18} />
          </span>
        </div>
      </div>
    </Link>

      {/* Любими — горе вдясно върху снимката, като в останалите карти с екскурзии */}
      <button
        type="button"
        onClick={() => {
          toggle({ id: favId, title: tour.title, img: tour.img, price: tour.price, country: tour.country, date: tour.date });
          setHeartPops(n => n + 1);
        }}
        aria-label={isFav ? "Премахни от любими" : "Добави в любими"}
        aria-pressed={isFav}
        className="group/heart absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/25 transition-all hover:bg-white active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <span key={heartPops} className={`block ${heartPops ? "heart-pop" : ""}`}>
          <Heart size={20} className={`transition-colors ${isFav ? "fill-red-500 text-red-500" : "text-white group-hover/heart:text-red-500"}`} />
        </span>
      </button>
    </article>
  );
}
