import type { CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight } from 'lucide-react';
import CountryFavButton from '@/components/destination/CountryFavButton';
import { InquiryButton } from '@/components/destination/DestinationInquiry';
import type { FavoriteCountry } from '@/lib/favoriteCountries';

interface DestinationHeroProps {
  countryName: string;
  heroImg: string;
  continent: string | null;
  tagline: string;
  tourCount: number;
  minPrice: string | null;
  nextDeparture: string | null;
  departures: string | null;
  poliCount: number;
  favorite: FavoriteCountry;
}

const rise = (d: number) => ({ '--d': `${d}s` }) as CSSProperties;
const focusRing = 'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-brand-gold';

const offersLabel = (n: number) => (n === 1 ? 'Виж офертата' : `Виж ${n}-те оферти`);

// Героят на страница на държава: снимка на цял екран, а главното меню на сайта стои прозрачно върху нея
// (Navbar.tsx) — отделна лента няма. Сървърен компонент: входът е чист CSS (.dest-kb / .dest-rise в globals.css),
// затова тръгва още с първия кадър. Клиентски са само бутоните „Запитване“ и „Запази“.
export default function DestinationHero({
  countryName, heroImg, continent, tagline, tourCount, minPrice, nextDeparture, departures, poliCount, favorite,
}: DestinationHeroProps) {
  const longest = Math.max(3, ...countryName.split(/\s+/).map((w) => w.length));

  const facts = [
    { label: 'Оферти', value: String(tourCount), big: true },
    minPrice && { label: 'Цени от', value: minPrice, big: true, gold: true },
    nextDeparture && { label: 'Следващо заминаване', value: nextDeparture },
    departures && { label: 'Заминавания', value: departures },
  ].filter(Boolean) as { label: string; value: string; big?: boolean; gold?: boolean }[];

  return (
    <section aria-labelledby="dest-title" className="relative flex min-h-[780px] items-end overflow-hidden bg-[#0b1120]">
      <div className="dest-kb absolute inset-0">
        <Image src={heroImg} alt={`Екскурзии до ${countryName}`} fill priority sizes="100vw" className="object-cover object-[50%_40%]" />
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,17,32,.62)_0%,rgba(11,17,32,.08)_26%,rgba(11,17,32,.28)_52%,rgba(11,17,32,.94)_100%)]" />
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,17,32,.55)_0%,rgba(11,17,32,0)_60%)]" />

      {/* Долу отдолу има място: ъглите на екрана са заети от бутоните за чат и бисквитки */}
      <div className="relative mx-auto w-full max-w-[1240px] px-6 pb-14 pt-[120px] min-[901px]:pb-[104px] min-[901px]:pt-[140px]">
        <nav aria-label="Навигационна пътека" className="dest-rise mb-8 min-[901px]:mb-10" style={rise(0.1)}>
          <ol className="flex flex-wrap items-center gap-2.5 text-sm text-white/80">
            <li><Link href="/" className={`rounded-sm hover:text-white ${focusRing}`}>Начало</Link></li>
            <li aria-hidden="true" className="text-white/45">/</li>
            <li><Link href="/destinations" className={`rounded-sm hover:text-white ${focusRing}`}>Дестинации</Link></li>
            <li aria-hidden="true" className="text-white/45">/</li>
            <li aria-current="page" className="font-semibold text-white">{countryName}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 items-end gap-8 min-[901px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] min-[901px]:gap-12">
          <div>
            {continent && (
              <p className="dest-rise mb-[18px] flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.22em] text-brand-gold" style={rise(0.1)}>
                <span aria-hidden="true" className="h-px w-9 bg-brand-gold" />
                {continent}
              </p>
            )}
            <h1 id="dest-title" className="m-0 leading-[0.9] text-white">
              <span className="dest-rise mb-1.5 block font-serif text-[clamp(28px,3.4vw,44px)] font-normal italic leading-[1.1] text-white/90" style={rise(0.25)}>
                Екскурзии до
              </span>
              <span
                className="dest-rise dest-name block font-display font-extrabold uppercase tracking-[-0.035em] [text-shadow:0_10px_60px_rgba(0,0,0,.35)]"
                style={{ ...rise(0.4), '--name-len': longest } as CSSProperties}
              >
                {countryName}
              </span>
            </h1>
            {tagline && (
              <p className="dest-rise mt-7 max-w-[520px] text-lg leading-relaxed text-white/90 [text-wrap:pretty]" style={rise(0.55)}>{tagline}</p>
            )}
            <div className="dest-rise mt-8 flex flex-wrap gap-3" style={rise(0.75)}>
              <a
                href="#oferti"
                className={`inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-brand-gold px-[26px] text-[15px] font-bold text-brand-dark transition-colors hover:bg-[#e6c65c] ${focusRing}`}
              >
                {offersLabel(tourCount)}
                <ArrowDown size={18} strokeWidth={2.2} aria-hidden="true" />
              </a>
              <InquiryButton className={`inline-flex min-h-[52px] items-center gap-2.5 rounded-full border border-white/45 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-white/15 ${focusRing}`}>
                Направи запитване
              </InquiryButton>
              <CountryFavButton country={favorite} variant="hero" />
            </div>
          </div>

          {/* Накратко — само факти, които важат за цялата дестинация. Без backdrop-blur: панелът се появява с
              анимация на прозрачност, а размиването се прерисува в края ѝ и примигва. */}
          <div className="dest-rise overflow-hidden rounded-3xl border border-white/[0.14] bg-[rgba(11,17,32,0.74)]" style={rise(0.75)}>
            <dl className="grid grid-cols-2">
              {facts.map((f, i) => {
                // Решетка 2×2: линия вдясно на лявата колона и отдолу на всички без последния ред; нечетен брой →
                // последният факт заема целия ред.
                const lastRow = Math.floor(i / 2) === Math.ceil(facts.length / 2) - 1;
                const wide = facts.length % 2 === 1 && i === facts.length - 1;
                return (
                <div
                  key={f.label}
                  className={`px-6 py-[22px] ${i % 2 === 0 && !wide ? 'border-r border-white/10' : ''} ${lastRow ? '' : 'border-b border-white/10'} ${wide ? 'col-span-2' : ''}`}
                >
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-white/[0.72]">{f.label}</dt>
                  <dd className={`mt-2 ${f.big ? 'font-display text-[26px] font-bold sm:text-[30px]' : 'text-lg font-semibold'} ${f.gold ? 'text-brand-gold' : 'text-white'}`}>
                    {f.value}
                  </dd>
                </div>
                );
              })}
            </dl>
            {poliCount > 0 && (
              <a href="#poli" className={`flex items-center justify-between gap-3 border-t border-white/10 px-6 py-3.5 text-sm text-white/90 hover:text-white ${focusRing}`}>
                <span className="inline-flex items-center gap-2.5">
                  <span aria-hidden="true" className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-gold font-serif text-[13px] font-semibold text-brand-dark">П</span>
                  {tourCount === 1
                    ? 'Екскурзията е водена от Поли'
                    : poliCount === tourCount
                      ? 'Всички екскурзии са водени от Поли'
                      : `${poliCount} от ${tourCount}-те екскурзии ${poliCount === 1 ? 'е водена' : 'са водени'} от Поли`}
                </span>
                <ArrowRight size={16} aria-hidden="true" className="shrink-0" />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
