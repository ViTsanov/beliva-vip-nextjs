"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const SLIDES = [
  {
    destination: 'Тайланд',
    subtitle: 'Храмове, плажове и незабравими залези',
    img: '/hero/thailand.webp',
    video: '/videos/web/thailand.mp4',
    filterHref: '/?country=tayland#tours-grid',
  },
  {
    destination: 'Австралия',
    subtitle: 'Природа без граници, приключения без край',
    img: '/hero/australia.webp',
    video: '/videos/web/australia.mp4',
    filterHref: '/?country=avstraliya#tours-grid',
  },
  {
    destination: 'Китай',
    subtitle: 'Хиляди години история и модерни чудеса',
    img: '/hero/china.webp',
    video: '/videos/web/china.mp4',
    filterHref: '/?country=kitay#tours-grid',
  },
  {
    destination: 'Перу',
    subtitle: 'Мачу Пикчу и изгубените цивилизации',
    img: '/hero/peru.webp',
    video: '/videos/web/peru.mp4',
    filterHref: '/?country=peru#tours-grid',
  },
  {
    destination: 'Сингапур',
    subtitle: 'Бъдещето среща традицията в Азия',
    img: '/hero/singapore.webp',
    video: '/videos/web/singapore.mp4',
    filterHref: '/?country=singapur#tours-grid',
  },
];

// Снимката на Поли в hero-то. Взета е poly-10.jpg (портрет с лице), а не poly.jpg — тя е широк кадър отзад
// от Мачу Пикчу и в малък кръг лицето ѝ почти не се вижда. zoom/origin приближават кадъра към лицето и раменете.
// За смяна на снимката се променя само този обект.
const POLI_PHOTO = {
  src: '/guides/poly-10.jpg',
  alt: 'Поли (Паулина Алексиева) — основател и водач на Beliva VIP Tour',
  objectPosition: '100% 50%',
  zoom: 1.6,
  origin: '52% 58%',
};

// Същите дестинации като в картата на Поли в секцията "Човекът зад пътуванията" (MeetGuides.tsx)

// Фиксиран, предвидим ритъм на всеки слайд: 3s само снимка, после клипче отгоре. Преходът към следващата
// държава се задвижва от реалното края на видеото (onEnded), не от фиксиран таймер. Фиксираният таймер по-долу
// остава само като предпазна мрежа за случай, в който видеото никога не затръгне/не завърши.
const PHOTO_DURATION = 3000;
// Таван за fallback-а — генерозен, така че да не пречи никога нормално играещо видео (клипчетата са 5-10s) —
// onEnded винаги ще стреля първо за работещо видео, тази стойност се използва само ако той никога не стреля.
const FALLBACK_VIDEO_CEILING = 12000;
const PHOTO_ONLY_DURATION = 6000; // колко стои всяка държава, когато няма видео
const CROSSFADE_DURATION = 1400; // съвпада с opacity transition-а на обвиващия div по-долу

function subscribeNoop() {
  return () => {};
}
function getCanPlayVideo() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const slowNetwork = !!conn && (conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType ?? ''));
  return (
    window.matchMedia('(min-width: 1024px)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    !slowNetwork
  );
}
function getCanPlayVideoServer() {
  return false;
}

export default function Hero() {
  const [current, setCurrent] = useState(0);
  // Проследява последния РЕНДВАН current — служи за синхронно засичане на смяна ПО ВРЕМЕ НА render (не в useEffect).
  // Официален React pattern за "adjust state when a value changes" (React docs), различен от useEffect, който
  // винаги изостава с поне един render цикъл.
  const [renderedCurrent, setRenderedCurrent] = useState(0);
  const [showVideoEl, setShowVideoEl] = useState(false); // след PHOTO_DURATION: дали <video> елементът вече е монтиран
  const [videoVisible, setVideoVisible] = useState(false); // дали видеото реално свири и трябва да е видимо (насложено върху снимката)
  // Индекс на слайда, чието видео все още трябва да остане монтирано, докато външният crossfade не завърши. Пазим
  // И дали видеото му реално е било потвърдено като играещо (wasVideoVisible) преди смяната — без това, ако
  // потребителят смени слайда РЪЧНО (стрелките), докато старият слайд все още беше в 3s photo-only фазата
  // (видеото му НИКОГА не е играло), lingering логиката безусловно го показваше при смяна, дори това видео да не
  // беше потвърдено като играещо нито веднъж — точно това е било "проблясването" на видеото на стария слайд.
  const [lingeringSlide, setLingeringSlide] = useState<{ index: number; wasVideoVisible: boolean } | null>(null);

  // При отваряне се зареждат само снимките на текущия, предишния и следващия слайд. Преди това всичките снимки
  // на цял екран се теглеха едновременно (са в viewport-а, само с opacity 0, така че lazy loading не помагаше)
  // и забавяха първата снимка. След 4s монтираме и останалите. Предишният слайд е нужен, защото вече
  // има стрелка "назад" — иначе при бърз клик снимката би изскочила от празно.
  const [preloadAll, setPreloadAll] = useState(false);

  // Клиповете са тежки (дори 720p са няколко MB всеки), затова се пускат само на широк екран и при нормална връзка.
  // На телефон, при „Пестене на данни“ или бавна мобилна мрежа hero-то остава със снимки (без изтегляне на видео).
  // useSyncExternalStore: на сървъра и при hydration стойността е false (еднакъв първи render, без hydration разлика),
  // после веднага се превключва към реалната стойност на клиента.
  const canPlayVideo = useSyncExternalStore(subscribeNoop, getCanPlayVideo, getCanPlayVideoServer);
  useEffect(() => {
    const t = setTimeout(() => setPreloadAll(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // СИНХРОННО по време на render (НЕ useEffect!) — засича смяна на current в СЪЩИЯ render цикъл, преди браузърът
  // изобщо да нарисува нещо. Точно тук беше бъгът от преди: useEffect винаги изпълнява един render кадър по-късно,
  // оставяйки видим момент, в който старият слайд вече не е current, но lingeringIndex още не е наваксал — видеото
  // му мигновено се демонтираше, разкривайки снимката му за части от секундата, преди crossfade-ът изобщо да
  // започне. С тази синхронна проверка React прихваща новото състояние и пре-рендва веднага, преди да нарисува
  // каквото и да е — така че бъгливият междинен кадър никога не се вижда.
  if (current !== renderedCurrent) {
    setLingeringSlide({ index: renderedCurrent, wasVideoVisible: videoVisible });
    setShowVideoEl(false);
    setVideoVisible(false);
    setRenderedCurrent(current);
  }

  // Таймерите остават в useEffect — setTimeout е неизбежен side effect, не може да се случи по време на render.
  useEffect(() => {
    const startVideoTimer = canPlayVideo ? setTimeout(() => setShowVideoEl(true), PHOTO_DURATION) : undefined;
    const lingerTimer = setTimeout(() => setLingeringSlide(null), CROSSFADE_DURATION);
    // Fallback — само ако onEnded никога не стреля (грешка, видео липсва за този слайд, браузърът блокира автоплей).
    // За работещо видео никога не трябва да се стига дотук — handleVideoEnded винаги ще стреля първо и ще го анулира.
    // Без видео (телефон/бавна връзка) слайдовете се сменят на фиксиран интервал.
    const fallbackTimer = setTimeout(() => {
      setCurrent(c => (c + 1) % SLIDES.length);
    }, canPlayVideo ? PHOTO_DURATION + FALLBACK_VIDEO_CEILING : PHOTO_ONLY_DURATION);

    return () => {
      if (startVideoTimer) clearTimeout(startVideoTimer);
      clearTimeout(fallbackTimer);
      clearTimeout(lingerTimer);
    };
  }, [current, canPlayVideo]);

  const handleVideoPlaying = () => setVideoVisible(true);
  // Основният двигател на прехода към следващата държава — стреля точно когато видеото реално свърши,
  // без изкуствена пауза между края на видеото и самия преход.
  const handleVideoEnded = () => setCurrent(c => (c + 1) % SLIDES.length);

  // Стрелките сменят държавата ръчно (вместо предишната лента с миниатюри отдолу).
  const goNext = useCallback(() => setCurrent(c => (c + 1) % SLIDES.length), []);
  const goPrev = useCallback(() => setCurrent(c => (c - 1 + SLIDES.length) % SLIDES.length), []);

  // JS-контролиран скрол вместо чист CSS anchor (scroll-behavior: smooth в globals.css) — на iOS/mobile Safari
  // нативната hash-навигация инога влиза в конфликт със CSS smooth scroll (особено с scroll-mt-*
  // отстъп на целта) — точно оттам идва видимото "бавно, после рязъв скок". scrollIntoView()
  // изчислява позицията наново в момента на самия клик, заобикаля това взаимодействие изцяло.
  const scrollToTours = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('tours-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const slide = SLIDES[current];
  const nextIndex = (current + 1) % SLIDES.length;
  const prevIndex = (current - 1 + SLIDES.length) % SLIDES.length;

  return (
    // Височината вече не е фиксирана: на мобилни hero-то е УДЪЛЖЕНО надолу (екран с държавата + блок за Поли),
    // на desktop (lg) е един екран, като Поли е до името на държавата.
    // За височината на екрана се ползва 100svh (small viewport height), не 100dvh — dvh се преизчислява в реално
    // време, докато адресната линия на мобилния браузър се скрива/показва при скрол, и точно това е видимото
    // „разтягане“ на hero-то за момент при скрол. svh е фиксирана стойност, не се преизчислява по време на скрол.
    <section className="relative w-full overflow-hidden bg-[#fcf9f2] lg:bg-brand-dark">

      {/* ─── ФОН: снимки и клипчета на държавите. На мобилни покрива само първия екран (100svh) и се
          стопява в тъмния фон отдолу — така снимката не се разтяга/реже върху цялото удължено hero. ─── */}
      <div className="absolute inset-x-0 top-0 z-0 h-[54svh] max-lg:overflow-hidden lg:h-full">

        {/* images — pure CSS transition, no framer-motion flash */}
        <div className="absolute inset-0">
          {SLIDES.map((s, i) => {
            const isCurrent = i === current;
            const isLingering = lingeringSlide?.index === i;
            // Видеото се монтира: (а) за активния слайд, след PHOTO_DURATION, или (б) за слайда, който тъкмо
            // престана да е активен, докато crossfade-ът му не завърши — НО само ако това видео реално е било
            // потвърдено като играещо преди смяната (wasVideoVisible).
            const lingeringWasPlaying = isLingering && !!lingeringSlide?.wasVideoVisible;
            const shouldMountVideo = canPlayVideo && ((isCurrent && showVideoEl) || lingeringWasPlaying);
            // За lingering слайда, видимостта зависи само от това дали видеото му реално беше потвърдено преди смяната.
            const isVideoVisible = lingeringWasPlaying || (isCurrent && videoVisible);
            const shouldMountImage = isCurrent || isLingering || i === nextIndex || i === prevIndex || preloadAll;

            return (
              <div
                key={s.img}
                className="absolute inset-0"
                style={{
                  opacity: isCurrent ? 1 : 0,
                  transition: 'opacity 1.4s ease-in-out',
                }}
              >
                {shouldMountImage && (
                  <Image
                    src={s.img}
                    alt={`${s.destination} — ${s.subtitle}`}
                    fill
                    className="object-cover"
                    style={{ objectPosition: 'center 40%' }}
                    priority={i === 0}
                    sizes="100vw"
                    quality={80}
                    fetchPriority={i === 0 ? 'high' : 'auto'}
                  />
                )}

                {/* Монтира се точно {PHOTO_DURATION / 1000}s след като слайдът стане активен, автоматично стартира, и се появява
                    плавно едва когато onPlaying реално стреля. БЕЗ loop — onEnded веднага превключва към следващата държава,
                    без пауза след края на видеото. */}
                {shouldMountVideo && s.video && (
                  <video
                    key={s.video}
                    src={s.video}
                    autoPlay={isCurrent}
                    muted
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{
                      objectPosition: 'center 35%',
                      opacity: isVideoVisible ? 1 : 0,
                      transition: 'opacity 0.8s ease-in-out',
                    }}
                    onPlaying={handleVideoPlaying}
                    onEnded={isCurrent ? handleVideoEnded : undefined}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* aurora mesh wash — adds depth/color without fighting the photo */}
        <div
          className="aurora-mesh absolute inset-0 z-[5] pointer-events-none"
          style={{ mixBlendMode: 'screen', opacity: 0.85 }}
        />

        {/* Top vignette — navbar readability */}
        <div
          className="absolute inset-x-0 top-0 z-10 h-32 pointer-events-none max-lg:opacity-60 lg:h-[35%]"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)' }}
        />
        {/* Bottom vignette — завършва в точния цвят на фона (brand-dark #0f172a), за да няма видим шев между
            снимката и удължената тъмна част отдолу, където е блокът за Поли. */}
        {/* Мобилни: снимката се стопява в цвета на страницата (крем/бяло). По-изразено преливане — стартира рано
            и минава през полупрозрачни стъпки, така че няма видим шев. */}
        <div
          className="absolute inset-x-0 bottom-0 z-10 h-[50%] pointer-events-none lg:hidden"
          style={{ background: 'linear-gradient(to top, #fcf9f2 0%, rgba(252,249,242,0.96) 10%, rgba(252,249,242,0.86) 22%, rgba(252,249,242,0.68) 36%, rgba(252,249,242,0.46) 50%, rgba(252,249,242,0.26) 64%, rgba(252,249,242,0.1) 80%, rgba(252,249,242,0.02) 92%, transparent 100%)' }}
        />
        {/* Desktop: затъмняване към brand-dark (под hero-то е тъмната секция „Топ 3“). */}
        <div
          className="absolute inset-x-0 bottom-0 z-10 hidden h-[60%] pointer-events-none lg:block"
          style={{ background: 'linear-gradient(to top, #0f172a 0%, rgba(15,23,42,0.85) 25%, rgba(0,0,0,0.45) 60%, transparent 100%)' }}
        />
        {/* Side vignettes for depth */}
        <div
          className="absolute inset-y-0 left-0 z-10 hidden pointer-events-none lg:block"
          style={{ width: '20%', background: 'linear-gradient(to right, rgba(0,0,0,0.35), transparent)' }}
        />
        <div
          className="absolute inset-y-0 right-0 z-10 hidden pointer-events-none lg:block"
          style={{ width: '20%', background: 'linear-gradient(to left, rgba(0,0,0,0.35), transparent)' }}
        />
      </div>

      {/* ─── СЪДЪРЖАНИЕ: мобилни = колона (държава → Поли), desktop = две колони (държава | Поли) ─── */}
      <div className="relative z-20 mx-auto flex w-full max-w-7xl flex-col px-6 lg:min-h-[100svh] lg:flex-row lg:items-end lg:justify-between lg:gap-12 lg:px-10 lg:pb-14 lg:pt-28 xl:pl-6">

        {/* Дестинацията */}
        <div className="flex flex-col items-center pb-5 text-center lg:min-h-0 lg:flex-1 lg:items-start lg:p-0 lg:text-left">

          {/* ── МОБИЛНИ: голяма снимка (фон) → карусел → (име + описание) → бутони → Поли ──
              Карусел: и петте държави в един и същ кръгов ред. В средата е текущата (най-голяма), отстрани са по-малки.
              Ред отляво надясно: предишна → ТЕКУЩА → следваща, така че автоматичната смяна (current + 1) „влачи“ снимките
              отдясно наляво: тази отдясно идва в средата, средната отива вляво. Клик върху снимка я прави текуща. ── */}
          {/* Разстояние, през което се вижда голямата снимка (фонът горе); каруселът леко влиза в стопения ѝ край. */}
          {/* Мобилни: името на държавата стои ВЪРХУ голямата снимка (без подзаглавие и без друг текст около него). */}
          <div className="relative h-[calc(54svh-44px)] w-full shrink-0 lg:hidden">
            <div className="hero-enter absolute inset-x-0 bottom-[84px] flex justify-center px-4" style={{ animationDelay: '0.15s' }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`dest-m-${current}`}
                  initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  className="text-center font-serif italic leading-none text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.8),0_0_3px_rgba(0,0,0,0.6)]"
                  style={{ fontSize: 'clamp(3rem, 15vw, 5rem)', letterSpacing: '-0.01em' }}
                >
                  {slide.destination}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <div className="hero-enter -mx-6 w-screen overflow-hidden lg:hidden" style={{ animationDelay: '0.1s' }}>
            <div className="relative mx-auto h-[128px] w-full">
              {SLIDES.map((t, i) => (
                <CarouselItem
                  key={t.img}
                  slide={t}
                  offset={ringOffset(i, current, SLIDES.length)}
                  onSelect={() => setCurrent(i)}
                />
              ))}
            </div>
          </div>

          {/* Име + подзаглавие. На мобилни заема горната част (над снимката), на desktop е `contents`. */}
          <div className="mt-3 flex w-full flex-col items-center lg:mt-0 lg:contents">

          <HeroIntro />

          {/* Истински H1 за SEO/screen readers — визуално скрит, защото видимата дестинация се сменя автоматично
              и сама по себе си не описва бизнеса пред търсачки/асистивни технологии. */}
          <h1 className="sr-only">
            Beliva VIP Tour - Групови пътувания, екскурзии и почивки по света с опитен водач
          </h1>

          {/* Име на държавата. На мобилни стрелките са от двете страни на името, на desktop са при бутоните. */}
          <div
            className="hero-enter mb-4 flex w-full items-center justify-center py-2 max-lg:hidden lg:mt-0 lg:w-auto lg:justify-start"
            style={{ animationDelay: '0.15s' }}
          >
            <div data-hero-name className="min-w-0 flex-1 lg:flex-none">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`dest-${current}`}
                  initial={{ opacity: 0, y: 50, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -30, filter: 'blur(4px)' }}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  className="font-serif italic leading-none text-brand-dark lg:text-white lg:[text-shadow:0_4px_40px_rgba(0,0,0,0.5)]"
                  style={{
                    fontSize: 'clamp(2.75rem, 14vw, 9rem)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {slide.destination}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Subtitle — фиксирана височина, за да не мърдат бутоните при смяна на държава */}
          <div
            className="hero-enter relative mb-3 h-11 w-full max-lg:hidden lg:mb-8 lg:h-14"
            style={{ animationDelay: '0.25s' }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={`sub-${current}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-x-0 top-0 text-sm font-normal leading-snug tracking-wide text-slate-600 md:text-base lg:font-light lg:text-white lg:[text-shadow:0_1px_10px_rgba(0,0,0,0.95),0_2px_20px_rgba(0,0,0,0.8)]"
              >
                {slide.subtitle}
              </motion.p>
            </AnimatePresence>
          </div>

          </div>

          {/* Бутони върху снимката, без панел отзад. На мобилни са избутани към дъното (mt-auto).
              Полето с името на държавата е с фиксирана ширина, за да не мърдат стрелките при смяна. */}
          <div
            className="hero-enter mt-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-[1.5rem] border border-brand-dark/10 bg-white px-3 py-3 shadow-xl shadow-brand-dark/10 lg:mt-0 lg:max-w-none lg:items-start lg:gap-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
            style={{ animationDelay: '0.35s' }}
          >
            <div className="flex w-full flex-row items-center gap-2 lg:w-auto lg:gap-3">
              <Link
                href="/#tours-grid"
                onClick={scrollToTours}
                className="group inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-brand-gold text-sm font-bold text-brand-dark shadow-xl shadow-black/30 transition-all hover:bg-amber-400 active:scale-95 lg:w-auto lg:flex-none lg:px-8"
              >
                Всички екскурзии
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5 max-lg:hidden" aria-hidden="true" />
              </Link>

              <div className="flex min-w-0 flex-1 items-center lg:w-auto lg:flex-none">
              <Link
                href={slide.filterHref}
                aria-label={`Екскурзии до ${slide.destination}`}
                className="inline-flex h-12 min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-full border border-brand-dark/70 text-sm font-bold text-brand-dark transition-all hover:bg-brand-dark hover:text-white lg:w-44 lg:flex-none lg:border-white/80 lg:text-white lg:[text-shadow:0_1px_8px_rgba(0,0,0,0.5)] lg:hover:bg-white lg:hover:text-brand-dark"
              >
                {slide.destination}
              </Link>
              </div>

              <div className="hidden items-center gap-2 pl-3 lg:flex">
                <ArrowButton dir="prev" onClick={goPrev} />
                <ArrowButton dir="next" onClick={goNext} />
              </div>
            </div>

            {/* Мобилни: три колони (число над етикет). От sm нагоре: един ред с разделители. */}
            <ul
              className="grid w-full grid-cols-3 gap-2 text-center sm:hidden"
            >
              {[
                { v: '60+', l: 'дестинации' },
                { v: '150+', l: 'водени групи' },
                { v: '4.9 ★', l: 'оценка' },
              ].map(({ v, l }) => (
                <li key={l} className="flex flex-col">
                  <span className="font-serif text-xl font-bold leading-none text-[#9a7611]">{v}</span>
                  <span className="mt-1 text-[11px] text-slate-600">{l}</span>
                </li>
              ))}
            </ul>
            <p
              className="hidden text-sm font-semibold tracking-wide text-[#e6c76a] sm:block lg:text-left"
              style={{ textShadow: '0 1px 10px rgba(0,0,0,0.85)' }}
            >
              60+ дестинации
              <span className="mx-3 text-[#e6c76a]/50" aria-hidden="true">|</span>
              150+ водени групи
              <span className="mx-3 text-[#e6c76a]/50" aria-hidden="true">|</span>
              оценка 4.9 ★
            </p>
          </div>
        </div>

        {/* Поли — на мобилни под дестинацията, на desktop до името на държавата */}
        <PoliWelcome />
      </div>
    </section>
  );
}


// Представяне на фирмата на мобилни (под карусела). На desktop същото се казва в картата на Поли (COMPANY_ABOUT).
const COMPANY_ABOUT = {
  name: 'Beliva VIP Tour',
  kind: 'туристическа агенция',
  text: 'Подбираме най-добрите екскурзии и почивки на българския пазар, водим организирани групи с личен водач и ви съпровождаме от първото запитване до завръщането.',
};

const INTRO = {
  eyebrow: 'Туристическа агенция',
  title: 'Групови екскурзии и почивки по света с водач',
};

function HeroIntro() {
  return (
    <div className="hero-enter mb-4 flex w-full max-w-sm flex-col items-center px-2 text-center lg:hidden" style={{ animationDelay: '0.25s' }}>
      <div className="flex items-center gap-3">
        <div className="h-px w-8 bg-brand-gold" />
        <span className="text-xs font-semibold tracking-[0.12em] text-brand-goldDeep">{INTRO.eyebrow}</span>
        <div className="h-px w-8 bg-brand-gold" />
      </div>
      <h2 className="mt-2 font-serif text-[1.3rem] italic leading-snug text-brand-dark">{INTRO.title}</h2>
    </div>
  );
}

// Позиция в кръга: -2..2 спрямо текущата. Положителен offset = „следваща“ (стои отдясно).
function ringOffset(i: number, current: number, n: number) {
  let d = (i - current) % n;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

const CAROUSEL_X = [0, 94, 168]; // |offset| 0,1,2 → отместване от центъра (px)
const CAROUSEL_SCALE = [1, 0.78, 0.58];
const CAROUSEL_OPACITY = [1, 0.92, 0.7];

function CarouselItem({ slide, offset, onSelect }: { slide: (typeof SLIDES)[number]; offset: number; onSelect: () => void }) {
  const abs = Math.min(Math.abs(offset), 2);
  const sign = offset > 0 ? 1 : -1; // следващата (offset > 0) е вдясно
  const x = offset === 0 ? 0 : sign * CAROUSEL_X[abs];
  // Ако снимката „прескача“ от единия край на другия (кръгов ред), местим я мигновено, а не през цялата лента.
  const [prevOffset, setPrevOffset] = useState(offset);
  const [jumped, setJumped] = useState(false);
  if (prevOffset !== offset) {
    setJumped(Math.abs(offset - prevOffset) > 2);
    setPrevOffset(offset);
  }
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-label={offset === 0 ? `${slide.destination} (избрана)` : `Покажи ${slide.destination}`}
      aria-current={offset === 0}
      initial={false}
      animate={{ x, scale: CAROUSEL_SCALE[abs], opacity: CAROUSEL_OPACITY[abs] }}
      transition={jumped ? { duration: 0 } : { duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
      className="absolute left-1/2 top-2 -ml-12 h-[120px] w-24 overflow-hidden rounded-2xl border-2 border-white"
      style={{ zIndex: 10 - abs * 3, willChange: 'transform' }}
    >
      <Image src={slide.img} alt="" fill sizes="120px" quality={60} className="object-cover" />
    </motion.button>
  );
}

// Стрелка за смяна на държавата — 44x44px (минимален размер за докосване на телефон)
function ArrowButton({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Предишна дестинация' : 'Следваща дестинация'}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/80 bg-black/30 text-white backdrop-blur-sm transition-all hover:bg-white hover:text-brand-dark active:scale-90 lg:bg-transparent lg:backdrop-blur-none"
    >
      <Icon size={22} aria-hidden="true" />
    </button>
  );
}

// Блок "Посреща ви Поли": кръгла снимка и под нея описание. Текстът е съставен от вече съществуващото
// съдържание на сайта (картата на Поли в MeetGuides.tsx), без нови твърдения.
function PoliWelcome() {
  return (
    <aside
      aria-label="Вашият водач Поли"
      className="hero-enter relative z-20 mx-auto flex w-full max-w-md flex-col items-center pb-14 pt-4 text-center lg:mx-0 lg:mt-0 lg:w-[340px] lg:max-w-none lg:shrink-0 lg:pb-0 xl:w-[380px]"
      style={{ animationDelay: '0.45s' }}
    >
      {/* Снимка — застъпва горния ръб на картата (-mb-12) */}
      <div className="relative z-10 -mb-12 h-28 w-28 shrink-0 rounded-full bg-gradient-to-br from-brand-gold to-[#f0d58a] p-1 shadow-2xl sm:h-32 sm:w-32 lg:h-36 lg:w-36">
        <div className="relative h-full w-full overflow-hidden rounded-full bg-brand-dark">
          <Image
            src={POLI_PHOTO.src}
            alt={POLI_PHOTO.alt}
            fill
            priority
            quality={80}
            // По-голям sizes от видимите ~140px — снимката е приближена (scale), затова се иска по-висока резолюция
            sizes="320px"
            className="object-cover"
            style={{
              objectPosition: POLI_PHOTO.objectPosition,
              transform: `scale(${POLI_PHOTO.zoom})`,
              transformOrigin: POLI_PHOTO.origin,
            }}
          />
        </div>
      </div>

      {/* Описание */}
      <div className="glass-panel glass-panel-hero-clear hero-card-light flex w-full flex-col items-center rounded-[2rem] px-6 pb-7 pt-16 lg:!border-white/20 lg:!bg-[rgba(15,23,42,0.84)] lg:pt-[4.75rem] lg:shadow-2xl lg:shadow-black/40">
        <h2 className="font-serif text-2xl italic leading-tight text-brand-dark lg:text-3xl lg:text-white">Паулина Алексиева</h2>
        <p className="mt-1 text-sm text-slate-500 lg:text-[#e6c76a]">Основател и водач</p>
        <p className="mt-4 text-sm leading-relaxed italic text-slate-700 lg:font-normal lg:text-white">
        &quot;Здравейте! Казвам се Поли и създадох тази агенция с цел да Ви представя най-добрите екскурзии и почивки на българския пазар. Основавам се на личния си опит, който е вече над 12 години. Ако имате въпроси - насреща съм!&quot;
        </p>

        <Link
          href="/about-us"
          className="group mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-brand-gold px-6 text-sm font-bold text-[#8a6a0f] transition-all hover:bg-brand-gold hover:text-brand-dark lg:border-brand-gold/70 lg:text-brand-gold"
        >
          Научете повече за мен
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>

        
      </div>
    </aside>
  );
}
