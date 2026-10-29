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
import { PalmSilhouette } from "@/components/decor/TravelDecor";

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

// Маската на снимката в картите: отгоре изцяло видима, към дъното изчезва в тъмния фон на картата
const PHOTO_FADE = "linear-gradient(to bottom, #000 0%, #000 62%, transparent 100%)";

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
// Секцията е тъмносиня лента с палми и маршрутни линии на фона. Картите са тъмни: снимката се разтапя в тъмния фон,
// а описанието е бял етикет върху долния ѝ край — без шева на билета от каталога (TourCard).
// При посочване картата светва със златен контур.
// На телефон и таблет — хоризонтален ред с плъзгане (следващата карта наднича отстрани), от lg — три колони.
export default function FeaturedTours({ tours, todayStr }: FeaturedToursProps) {
  const featured = pickFeatured(tours);
  if (featured.length === 0) return null;

  return (
    // Появяване при скрол: заглавието, после трите карти една след друга, а снимките леко се отдалечават
    // (.reveal / .reveal-zoom в globals.css; при намалено движение — само избледняване)
    <RevealGroup as="section" aria-labelledby="featured-heading" className="relative overflow-hidden bg-brand-dark py-14 text-white md:py-20">
      <TopToursBackdrop />
      <div className="container relative mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="reveal mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end md:mb-10">
          <div>
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold">
              Горещи предложения
            </span>
            <h2 id="featured-heading" className="font-serif text-3xl italic leading-tight text-white md:text-4xl">
              Топ <span className="text-brand-gold">3</span> екскурзии
            </h2>
          </div>
          <Link
            href="#tours-grid"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("tours-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="group inline-flex min-h-11 shrink-0 items-center gap-2 self-start text-[13px] font-semibold text-white underline decoration-brand-gold decoration-2 underline-offset-[6px] transition-[text-decoration-color] hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-gold sm:self-auto"
          >
            Всички екскурзии
            <ArrowRight size={14} className="transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>

        {/* Плъзгащ се ред до lg; от lg — решетка с три равни колони. Отстъпът -mx/px пуска картите до ръба на екрана.
            pt-2 оставя място за повдигането на картата при посочване — иначе скролът изрязва горния ѝ ръб. */}
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 pt-2 [scrollbar-color:rgba(255,255,255,0.3)_transparent] [scrollbar-width:thin] sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0 lg:pt-0">
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

// Фонът на тъмната лента: бледи извити „паралели“, пунктирен маршрут със златни точки и две палми в ъглите.
// Само украса (aria-hidden, без движение); бялото е с ниска непрозрачност, за да не пречи на текста.
function TopToursBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <svg viewBox="0 0 1440 700" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <g fill="none" stroke="#fff" strokeWidth="1.25" opacity="0.12">
          <path d="M-60 560 Q720 440 1500 560" />
          <path d="M-60 620 Q720 500 1500 620" />
          <path d="M-60 680 Q720 560 1500 680" />
          <path d="M-60 110 Q720 10 1500 110" />
        </g>
        <path d="M820 120 Q1100 -10 1380 150" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="2 9" strokeLinecap="round" opacity="0.4" />
        <circle cx="820" cy="120" r="5" fill="#d4af37" opacity="0.85" />
        <circle cx="1380" cy="150" r="5" fill="#d4af37" opacity="0.85" />
      </svg>
      <PalmSilhouette className="absolute -bottom-6 -left-12 w-44 text-white/10 md:w-80" />
      <PalmSilhouette className="absolute -right-10 top-6 w-32 -scale-x-100 text-white/10 md:w-56" />
    </div>
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
  // Светването при посочване е златен контур и сияние (box-shadow) — остава видимо и при намалено движение;
  // повдигането и приближаването на снимката са само с motion-safe.
  return (
    <article
      className={`group relative h-full overflow-hidden rounded-[28px] bg-[#16213a] transition-[box-shadow,transform] duration-300 ease-out hover:shadow-[0_0_0_1px_#d4af37,0_22px_50px_-18px_rgba(212,175,55,0.5)] focus-within:shadow-[0_0_0_1px_#d4af37,0_22px_50px_-18px_rgba(212,175,55,0.5)] motion-safe:hover:-translate-y-1 ${
        isLedByPoli ? "border-2 border-brand-gold" : "border border-white/10"
      }`}
    >
    <Link
      href={`/tour/${slug}`}
      className="relative flex h-full flex-col rounded-[28px] focus-visible:outline focus-visible:outline-[3px] focus-visible:-outline-offset-[3px] focus-visible:outline-brand-gold"
    >
      {/* Снимка */}
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden">
        {/* Долният край на снимката се разтапя в тъмния фон на картата (маска, а не тъмен слой отгоре — така няма шев);
            отстрани на белия етикет снимката не свършва с рязък ръб. */}
        <div className="absolute inset-0" style={{ maskImage: PHOTO_FADE, WebkitMaskImage: PHOTO_FADE }}>
        {img ? (
          <div className="reveal-zoom absolute inset-0" style={{ '--reveal-delay': '0.12s' } as CSSProperties}>
          <Image
            src={img}
            alt=""
            fill
            priority={priority}
            onLoad={() => setImgLoaded(true)}
            className={`object-cover motion-safe:group-hover:scale-105 ${imgLoaded || priority ? "opacity-100" : "opacity-0"}`}
            style={{ transition: "transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms ease", objectPosition: tour.imgPosition || "50% 50%" }}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 46vw, 84vw"
          />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-start justify-center bg-[#24345a] pt-10">
            <span className="font-serif text-6xl italic text-brand-gold/25" aria-hidden="true">
              {country?.charAt(0) || "?"}
            </span>
          </div>
        )}
        </div>

        {/* Статус на групата — горе вляво */}
        <div className="absolute left-4 top-4 flex flex-col items-start gap-2">
          {isTopPick && (
            <span className="rounded-full bg-brand-gold px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-dark shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
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
          {/* Долната част на снимката е заета от заглавието — затова значката на Поли е при останалите */}
          {isLedByPoli && <Badge variant="poli" />}
        </div>
      </div>

      {/* Какво е турът — бял „етикет“, който се качва върху долния край на снимката и оставя тъмна рамка отстрани */}
      <div className="relative z-[1] mx-3 -mt-12 flex grow flex-col rounded-2xl bg-white px-4 pb-4 pt-4 shadow-[0_14px_30px_-16px_rgba(0,0,0,0.7)]">
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

      {/* Кога и колко — двете неща, по които се решава; върху тъмния фон на картата, под белия етикет */}
      <div className="mx-5 flex items-end justify-between gap-3 pb-5 pt-4">
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
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/20 text-brand-gold transition-colors duration-200 group-hover:border-brand-gold group-hover:bg-brand-gold group-hover:text-brand-dark sm:flex"
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
