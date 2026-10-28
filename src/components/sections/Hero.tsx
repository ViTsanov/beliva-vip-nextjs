"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { AnimatePresence, animate, motion, useMotionValue, type PanInfo, type Variants } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { glideToElement } from '@/lib/smoothScroll';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { GlobePlace } from './HeroGlobe';
import { afterPageLoad } from '@/lib/afterPageLoad';
import HeroRing from './HeroRing';
import { useVisitorEngaged } from '@/lib/hooks/useVisitorEngaged';

// Глобусът (globe.gl / three.js) се зарежда отделно и само на широк екран — не тежи на първото зареждане.
const HeroGlobe = dynamic(() => import('./HeroGlobe'), { ssr: false });

const SOFIA = { lat: 42.6977, lon: 23.3219 };

// Разстояние по права линия от София (km, закръглено до 50). Изчислява се еднакво на сървъра и клиента.
function kmFromSofia(lat: number, lon: number) {
  const r = Math.PI / 180;
  const dLat = (lat - SOFIA.lat) * r;
  const dLon = (lon - SOFIA.lon) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(SOFIA.lat * r) * Math.cos(lat * r) * Math.sin(dLon / 2) ** 2;
  return Math.round((6371 * 2 * Math.asin(Math.sqrt(a))) / 50) * 50;
}
const formatKm = (km: number) => `${Math.floor(km / 1000)} ${String(km % 1000).padStart(3, '0')} км`;

// em — ширината на името (главни букви, Unbounded 700, letter-spacing -0.035em), измерена в браузър; по нея
//   надписът запълва точно ширината на колоната. lsb — празното място пред първата буква (в em).
// city/timeZone/lat/lon — за местното време и разстоянието от София.
// globe — къде застава глобусът (центърът на страната) и името ѝ в картата (world-atlas, на английски).
// focus — къде е главното в снимката (част от ширината ѝ). На широк екран глобусът закрива долния десен
//   ъгъл, затова снимката се измества така, че това място да е вляво от него (вж. HeroPhoto).
// focusY — вертикалното изрязване на широк екран (object-position, %), така че главното да е в средата на
//   празното място между заглавието и името. wide — колко пъти по-широка от екрана е снимката (по подразбиране
//   PHOTO_WIDE); по-голямо, когато главното е вдясно и иначе остава зад глобуса (Операта в Сидни).
const SLIDES = [
  {
    destination: 'Перу',
    blurb: 'Мачу Пикчу високо в Андите, Свещената долина и улиците на Куско — до сърцето на империята на инките.',
    img: '/hero/peru2.jpg',
    focus: 0.5,
    focusY: 25,
    filterHref: '/?country=peru#tours-grid',
    em: 3.274,
    lsb: 0.06,
    city: 'Куско',
    timeZone: 'America/Lima',
    lat: -13.532,
    lon: -71.9675,
    globe: { geoName: 'Peru', lat: -10, lng: -75 },
  },
  {
    destination: 'Китай',
    blurb: 'Великата стена, Забраненият град и Теракотената армия — пет хиляди години история до най-модерните градове на света.',
    img: '/hero/china2.jpg',
    focus: 0.48,
    focusY: 40,
    filterHref: '/?country=kitay#tours-grid',
    em: 4.316,
    lsb: 0.06,
    city: 'Пекин',
    timeZone: 'Asia/Shanghai',
    lat: 39.9042,
    lon: 116.4074,
    globe: { geoName: 'China', lat: 34, lng: 104 },
  },
    {
    destination: 'Мексико',
    blurb: 'Пирамидите на маите в Чичен Ица, карибските плажове на Юкатан и шарените улици на Мексико Сити.',
    img: '/hero/mexico.webp',
    focus: 0.5,
    focusY: 40,
    filterHref: '/?country=meksiko#tours-grid',
    em: 6.307,
    lsb: 0.06,
    city: 'Мексико Сити',
    timeZone: 'America/Mexico_City',
    lat: 19.4326,
    lon: -99.1332,
    globe: { geoName: 'Mexico', lat: 23, lng: -102 },
  },
  {
    destination: 'Австралия',
    blurb: 'Операта в Сидни, Големият бариерен риф и червената пустиня около Улуру — природа, каквато няма другаде.',
    img: '/hero/australia3.jpg',
    focus: 0.6,
    focusY: 45,
    wide: 1.5,
    filterHref: '/?country=avstraliya#tours-grid',
    em: 7.773,
    lsb: -0.01,
    city: 'Сидни',
    timeZone: 'Australia/Sydney',
    lat: -33.8688,
    lon: 151.2093,
    globe: { geoName: 'Australia', lat: -25, lng: 134 },
  },
  {
    destination: 'Тайланд',
    blurb: 'Златните храмове на Банкок, нощните пазари на Чианг Май и плажовете на Андаманско море.',
    img: '/hero/thailand2.jpg',
    focus: 0.4,
    focusY: 70,
    filterHref: '/?country=tayland#tours-grid',
    em: 6.351,
    lsb: 0.01,
    city: 'Банкок',
    timeZone: 'Asia/Bangkok',
    lat: 13.7563,
    lon: 100.5018,
    globe: { geoName: 'Thailand', lat: 15, lng: 101 },
  },
].map(s => ({ ...s, km: kmFromSofia(s.lat, s.lon) }));

type Slide = (typeof SLIDES)[number];

const GLOBE_PLACES: GlobePlace[] = SLIDES.map(s => ({ ...s.globe, label: s.destination }));
const GLOBE_INTRO = { lat: SOFIA.lat, lng: SOFIA.lon };

// 24-часов формат без „ч.“ (bg-BG го добавя).
const TIME_FORMATS = SLIDES.map(s => new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: s.timeZone,
}));

// Колко стои всяка дестинация.
const SLIDE_DURATION = 8000;
// Глобусът: монтира се след първия кадър; при автоматична смяна първо се завърта до следващата дестинация
// (GLOBE_SPIN) и чак когато „кацне“, снимката се сменя. При намалено движение — кратко обръщане.
const GLOBE_DELAY = 900;
const GLOBE_SPIN = 2200;
const GLOBE_TURN_REDUCED = 1000;
// Смяната на снимката: новата се разтваря от страната на глобуса.
const MORPH = 1.1;
const EASE_IN_OUT: [number, number, number, number] = [0.77, 0, 0.175, 1];
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
// Таван за височината на името — късите (Перу) иначе биха заели половин екран.
const WORD_MAX = '24svh';
// Плъзгане с пръст/мишка: снимката следва ръката 1:1 и, ако жестът (с проектирания momentum) отнесе поне
// SWIPE_RATIO от ширината, довършва пътя до края, а съседната влиза на мястото ѝ.
const SWIPE_RATIO = 0.25;

// Spring без отскок — прекъсваем и наследява скоростта на жеста.
const springTo = (duration: number, velocity = 0) => ({ type: 'spring' as const, bounce: 0, duration, velocity });
// Докъде би стигнал жестът по инерция (exponential decay, decelerationRate 0.998).
const project = (velocity: number) => ((velocity / 1000) * 0.998) / (1 - 0.998);

// Как се сменя снимката: 'morph' — автоматично, стрелки, кръгчета; 'slide' — с ръка (вече е доплъзгана).
type ChangeMode = 'morph' | 'slide';
// Глобусът — само на широк и достатъчно висок екран (иначе застъпва заглавието или името). Същото условие
// е и в CSS класовете с [@media(min-height:640px)].
export const STAGE_QUERY = '(min-width: 1024px) and (min-height: 640px)';
// Диаметърът на сферата; 20% от нея остава извън екрана вдясно и долу. Над нея (под менюто) остава ивица
// за текста на дестинацията — затова не е по-голям от 80% от височината.
const GLOBE_D = 'min(80svh, 62vw)';
// Еднакви с HeroClassic.tsx — двата героса са в страницата едновременно и така свалят една и съща снимка.
const PHOTO_SIZES = '130vw';
// Качество на снимките в героса — 70%: на снимка разликата от 75 не се вижда, а файлът е по-малък. Еднакво в Hero.tsx и
// HeroClassic.tsx, иначе двата героса теглят различни файлове.
const PHOTO_QUALITY = 70;
// На широк екран снимката е PHOTO_WIDE (или slide.wide) пъти по-широка от екрана и се измества така, че focus да застане на
// FOCUS_AT от ширината — вляво от глобуса. Изместването е ограничено, за да покрива снимката целия екран.
const PHOTO_WIDE = 1.3;
const FOCUS_AT = 0.33;
const photoShift = (focus: number, wide = PHOTO_WIDE) => Math.min(0, Math.max(1 - wide, FOCUS_AT - focus * wide)) * 100;

function getServerFalse() {
  return false;
}

// Media query през useSyncExternalStore: при hydration връща сървърната стойност (false), иначе
// условно рендираните части се разминават със сървърния HTML.
function useMedia(query: string) {
  const subscribe = useCallback((cb: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, getServerFalse);
}

// Текущата минута — за местното време в дестинацията. На сървъра е -1 (часът се показва само в браузъра).
function subscribeMinute(cb: () => void) {
  const id = setInterval(cb, 15000);
  return () => clearInterval(id);
}
const getMinute = () => Math.floor(Date.now() / 60000);
const getMinuteServer = () => -1;

export default function Hero() {
  const router = useRouter();
  const reduceMotion = useMedia('(prefers-reduced-motion: reduce)');
  const minute = useSyncExternalStore(subscribeMinute, getMinute, getMinuteServer);
  const stage = useMedia(STAGE_QUERY);

  const [current, setCurrent] = useState(0);
  const currentRef = useRef(0);
  const [changeMode, setChangeMode] = useState<ChangeMode>('morph');
  // Плъзгането: трактът (съседна снимка — текуща — съседна) се мести с dragX
  const panelRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);
  const slideAnim = useRef<ReturnType<typeof animate> | null>(null);
  const sliding = useRef(false);
  const [dragging, setDragging] = useState(false);
  // Останалите снимки се зареждат скрито малко след първия кадър — иначе при смяна новата снимка
  // би се разтворила, преди да е заредена (тъмен кадър).
  const [preload, setPreload] = useState(false);

  // Глобусът
  const [globeMounted, setGlobeMounted] = useState(false);
  const [globeOk, setGlobeOk] = useState(false);
  const [globeFailed, setGlobeFailed] = useState(false);
  const globeLive = stage && globeMounted && globeOk;
  // Автоматична смяна в ход: от кой слайд е тръгнала (глобусът вече се върти към следващия).
  const [autoSpinFrom, setAutoSpinFrom] = useState<number | null>(null);
  // Къде е кацнал глобусът последно — текстът се разтваря от точката само когато е кацнал на показаната снимка.
  const [landedIndex, setLandedIndex] = useState<number | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Източници на пауза. Слайдшоуто върви само когато НИТО ЕДИН от тях не е активен (WCAG 2.2.2).
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [globeHover, setGlobeHover] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [inView, setInView] = useState(true);
  // На телефон и нисък екран се вижда HeroClassic.tsx — тогава този спи (!stage)
  // Автоматичната смяна тръгва след първия скрол/докосване/клавиш на посетителя — виж useVisitorEngaged
  const engaged = useVisitorEngaged();
  const paused = userPaused || hoverPaused || globeHover || focusPaused || dragging || tabHidden || !inView || !stage || !engaged;
  const pausedRef = useRef(false);

  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    currentRef.current = current;
  }, [current]);
  useLayoutEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    // Останалите снимки — чак след като страницата се зареди (иначе се бутат с първия екран за мрежата)
    const cancelPreload = afterPageLoad(() => setPreload(true), 2000);
    const t2 = setTimeout(() => setGlobeMounted(true), GLOBE_DELAY);
    return () => {
      cancelPreload();
      clearTimeout(t2);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Извън екрана нищо не се сменя — пести батерия.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const changeTo = useCallback((i: number) => {
    if (i === currentRef.current || sliding.current) return;
    setPreload(true);
    setAutoSpinFrom(null);
    setChangeMode('morph');
    setCurrent(i);
  }, []);
  const next = useCallback(() => changeTo((currentRef.current + 1) % SLIDES.length), [changeTo]);
  const prev = useCallback(() => changeTo((currentRef.current - 1 + SLIDES.length) % SLIDES.length), [changeTo]);

  // Обръчът свърши (автоматична смяна). С глобус: първо се завърта до следващата дестинация, а снимката се
  // сменя, когато той „кацне“ (handleLanded). Без глобус — веднага.
  const handleRingEnd = useCallback(() => {
    if (!globeLive) {
      next();
      return;
    }
    setPreload(true);
    setAutoSpinFrom(currentRef.current);
  }, [globeLive, next]);

  const handleLanded = useCallback((index: number) => {
    setLandedIndex(index);
    const from = currentRef.current;
    if ((from + 1) % SLIDES.length !== index) return;
    // Кацна на следващата при автоматична смяна → снимката се сменя. При пауза (мишка върху управлението
    // или глобуса) изчаква паузата да мине.
    const commit = () => {
      if (currentRef.current !== from) return;
      if (pausedRef.current) {
        retryTimer.current = setTimeout(commit, 250);
        return;
      }
      changeTo(index);
    };
    commit();
  }, [changeTo]);

  // Клик върху страна на глобуса — тя влиза във филтъра на екскурзиите.
  const applyFilter = useCallback((i: number) => {
    router.push(SLIDES[i].filterHref.replace('#tours-grid', ''), { scroll: false });
    glideToElement(document.getElementById('tours-grid'));
  }, [router]);

  // JS-контролиран скрол: нативната hash-навигация на iOS Safari се бие със CSS smooth scroll.
  const scrollToTours = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    glideToElement(document.getElementById('tours-grid'));
  }, []);

  // Плъзгане с ръка. Хващане по време на анимация я спира и продължава от текущата позиция.
  const handleDragStart = () => {
    slideAnim.current?.stop();
    sliding.current = false;
    setPreload(true);
    setDragging(true);
  };
  const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    setDragging(false);
    const width = panelRef.current?.offsetWidth ?? window.innerWidth;
    const v = info.velocity.x;
    const projected = dragX.get() + project(v);
    const dir = projected < -width * SWIPE_RATIO ? 1 : projected > width * SWIPE_RATIO ? -1 : 0;
    if (dir === 0) {
      slideAnim.current = animate(dragX, 0, springTo(0.45, v));
      return;
    }
    // Довършва пътя до края; в същия кадър, в който стигне, съседната става текуща и трактът се връща в 0
    // (тя вече стои точно там) — без скок и без разтваряне.
    sliding.current = true;
    const target = (currentRef.current + dir + SLIDES.length) % SLIDES.length;
    slideAnim.current = animate(dragX, -dir * width, {
      ...springTo(0.55, v),
      onComplete: () => {
        flushSync(() => {
          setChangeMode('slide');
          setAutoSpinFrom(null);
          setCurrent(target);
        });
        dragX.set(0);
        sliding.current = false;
      },
    });
  };

  const slide = SLIDES[current];
  const localTime = minute < 0 ? null : TIME_FORMATS[current].format(minute * 60000);
  // Накъде гледа глобусът: при автоматична смяна — към следващата (с пълно завъртане, още преди снимката);
  // иначе — към показаната (кратко обръщане след стрелка, кръгче или плъзгане).
  const autoSpinning = autoSpinFrom !== null && autoSpinFrom === current;
  const globeIndex = autoSpinning ? (current + 1) % SLIDES.length : current;
  const showGlobeNote = globeLive && landedIndex === current && globeIndex === current;
  // Текстът над управлението — когато глобусът не е на екран (телефон, нисък екран, без WebGL). На нисък
  // широк екран не се побира между заглавието и името — там остава само името.
  const inlineNoteClass = globeFailed
    ? 'lg:[@media(max-height:720px)]:hidden'
    : 'lg:[@media(min-height:640px)]:hidden lg:[@media(max-height:720px)]:hidden';

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label="Дестинации на Beliva VIP Tour"
      className="relative isolate h-[100svh] min-h-[36rem] overflow-hidden bg-brand-dark text-white"
      onFocus={e => { if (e.target.matches(':focus-visible')) setFocusPaused(true); }}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocusPaused(false); }}
    >
      {/* ─── СНИМКАТА: на целия екран; на широк екран глобусът просто закрива долния ѝ десен ъгъл, а самата снимка
           е изместена така, че главното в нея да е вляво от него. Автоматичната смяна: новата снимка се разтваря
           от глобуса върху старата. С ръка: трактът (предишна — текуща — следваща) следва пръста и довършва
           плъзгането до края. ─── */}
      <div ref={panelRef} className="absolute inset-0 z-0 overflow-hidden">
        <motion.div
          drag="x"
          dragMomentum={false}
          dragElastic={0}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          style={{ x: dragX, touchAction: 'pan-y' }}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        >
          {/* Съседите — отляво и отдясно, извън кадъра, докато ръката не ги издърпа */}
          {(preload || dragging) && [-1, 1].map(side => {
            const s = SLIDES[(current + side + SLIDES.length) % SLIDES.length];
            return (
              <div key={`${side}-${s.img}`} aria-hidden="true" className="absolute inset-y-0 w-full overflow-hidden" style={{ left: `${side * 100}%` }}>
                <HeroPhoto slide={s} />
              </div>
            );
          })}
          <AnimatePresence initial={false} custom={changeMode}>
            <PhotoLayer
              key={slide.img}
              slide={slide}
              mode={changeMode}
              isFirst={current === 0}
              paused={paused}
              reduced={reduceMotion}
            />
          </AnimatePresence>
        </motion.div>
        {/* Неутрални затъмнения: горе — под менюто и заглавието; долу — под името и управлението; на широк екран
            и меко кръгло около глобуса, за да не се слива с ярко небе */}
        <div className="pointer-events-none absolute inset-0 z-10 hidden bg-[radial-gradient(circle_at_80%_75%,rgba(0,0,0,0.5),transparent_55%)] lg:[@media(min-height:640px)]:block" /* taste-skill-ignore: неутрално затъмнение върху снимка */ />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-2/3 bg-gradient-to-b from-black/65 via-black/25 to-transparent" /* taste-skill-ignore: неутрално затъмнение върху снимка */ />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/2 bg-gradient-to-t from-black/75 via-black/30 to-transparent" /* taste-skill-ignore: неутрално затъмнение върху снимка */ />
      </div>

      {/* Останалите снимки — скрито предварително зареждане със същите sizes, за да е готова всяка, преди да потрябва */}
      {preload && (
        <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-hidden opacity-0">
          {SLIDES.filter((_, i) => i !== current).map(s => (
            <div key={s.img} className="relative h-px w-px">
              <Image src={s.img} alt="" fill sizes={PHOTO_SIZES} quality={PHOTO_QUALITY} />
            </div>
          ))}
        </div>
      )}

      {/* ─── ГЛОБУСЪТ: голям, в долния десен ъгъл — 20% от него остава извън екрана. Сферата е в центъра
           на платното (то е 1.2 пъти по-голямо, за ореола и повдигнатата страна), а точката на показаната
           дестинация е точно в този център — оттам се разтваря текстът. ─── */}
      {stage && globeMounted && !globeFailed && (
        <div
          className="pointer-events-none absolute z-10 hidden lg:[@media(min-height:640px)]:block"
          style={{
            width: `calc(${GLOBE_D} * 1.2)`,
            height: `calc(${GLOBE_D} * 1.2)`,
            right: `calc(${GLOBE_D} * -0.3)`,
            bottom: `calc(${GLOBE_D} * -0.3)`,
          }}
        >
          {/* Платното е квадратно и ъгълът му застъпва снимката — изрязано в кръг (сферата + ореола), за да
              минават мишката и плъзгането покрай глобуса към снимката. Текстът е извън изрязването. */}
          <div className="pointer-events-auto absolute inset-0 [clip-path:circle(49.5%_at_50%_50%)]">
            <HeroGlobe
              places={GLOBE_PLACES}
              active={globeIndex}
              spin={autoSpinning}
              spinMs={reduceMotion ? GLOBE_TURN_REDUCED : GLOBE_SPIN}
              reduced={reduceMotion}
              running={inView && !tabHidden}
              intro={reduceMotion ? null : GLOBE_INTRO}
              onReady={ok => { setGlobeOk(ok); if (!ok) setGlobeFailed(true); }}
              onLanded={handleLanded}
              onHoverChange={setGlobeHover}
              onSelect={applyFilter}
            />
          </div>
        </div>
      )}
      {stage && globeMounted && !globeFailed && (
        <AnimatePresence>
          {showGlobeNote && (
            <GlobeNote
              key={slide.img}
              slide={slide}
              localTime={localTime}
              reduced={reduceMotion}
              onFilter={() => applyFilter(current)}
            />
          )}
        </AnimatePresence>
      )}

      {/* ─── ГОРЕ: какво правим и главното действие. pointer-events-none, за да минава жестът през текста. ─── */}
      <div className="pointer-events-none relative z-20 container mx-auto px-6 pt-24 lg:pt-28 lg:[@media(max-height:780px)]:pt-24">
        {/* Заглавие ниво 1 за екранните четци, но не <h1>: в HTML-а са и двата героса и истинският <h1> е този в
            HeroClassic (телефонът, който Google гледа) — иначе страницата имаше два <h1>. */}
        <p
          role="heading"
          aria-level={1}
          className="hero-enter max-w-[11.8em] font-display font-normal text-white"
          style={{
            fontSize: 'min(3.25rem, (100vw - 3rem) / 11.4)',
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            animationDelay: '0.05s',
          }}
        >
          Групови екскурзии по света с водач
        </p>

        <p
          className="hero-enter mt-4 hidden max-w-[30rem] text-lg leading-relaxed text-white sm:[@media(min-height:781px)]:block"
          style={{ animationDelay: '0.12s' }}
        >
          Подбираме най-добрите екскурзии на българския пазар и ви съпровождаме от първото запитване до завръщането.
        </p>

        <div className="hero-enter mt-5 lg:mt-7" style={{ animationDelay: '0.18s' }}>
          {/* Главното действие на страницата — единственият плътен златен бутон (в менюто „Запитване“ е с контур).
              През него минава отблясък два пъти (.hero-cta-shine в globals.css; без него при „намалено движение“). */}
          <Link
            href="/#tours-grid"
            onClick={scrollToTours}
            className="group relative cursor-pointer touch-manipulation overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white pointer-events-auto inline-flex h-12 shrink-0 items-center justify-center gap-3 rounded-full bg-brand-gold pl-6 pr-1.5 text-[15px] font-semibold text-brand-dark shadow-[0_10px_30px_-6px_rgba(212,175,55,0.7)] ring-4 ring-brand-gold/30 transition-[background-color,box-shadow,transform] duration-200 hover:bg-amber-300 hover:shadow-[0_14px_40px_-6px_rgba(212,175,55,0.85)] active:scale-[0.97] sm:h-14 sm:pl-8 sm:pr-2 sm:text-base"
          >
            <span aria-hidden="true" className="hero-cta-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            <span className="relative">Разгледай екскурзиите</span>
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-brand-dark text-brand-gold transition-transform duration-200 group-hover:translate-x-0.5 sm:h-10 sm:w-10" aria-hidden="true">
              <ArrowRight size={18} />
            </span>
          </Link>
        </div>
      </div>

      {/* ─── ДОЛУ ВЛЯВО, върху снимката: текстът (когато няма глобус), името и най-долу кръгчетата — винаги на
           едно и също място. Лявият ръб следва контейнера на менюто; на широк екран колоната свършва преди
           глобуса. Отстъпът отдолу пази ъглите (бисквитки вляво, чат вдясно). ─── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-6 pb-[max(6rem,env(safe-area-inset-bottom))] lg:pb-[4.5rem] lg:pl-[calc((100%-1024px)/2+1.5rem)] xl:pl-[calc((100%-1280px)/2+1.5rem)] 2xl:pl-[calc((100%-1536px)/2+1.5rem)] lg:[@media(min-height:640px)]:pr-[calc(40%+2rem)]">
        <div className={`mb-4 max-w-[34rem] ${inlineNoteClass}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide.img}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 10, filter: reduceMotion ? 'none' : 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
            >
              <p className="text-base font-medium leading-snug text-white sm:text-lg">{slide.blurb}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-white/85">
                {localTime && <span>В {slide.city} е {localTime}</span>}
                <span>{formatKm(slide.km)} от София</span>
                <Link
                  href={slide.filterHref}
                  className="pointer-events-auto inline-flex min-h-11 cursor-pointer touch-manipulation items-center font-semibold text-white underline decoration-2 underline-offset-[6px] transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Екскурзии до {slide.destination}
                </Link>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Името — запълва ширината на колоната; при смяна буквите се разтварят една след друга. Стои над
            кръгчетата: имената са с различна височина и растат нагоре, а кръгчетата остават на едно място. */}
        <div className="hero-intro-word mb-3 [container-type:inline-size] lg:mb-4" aria-hidden="true">
          {/* items-end: старото и новото име са в една клетка — подравнени отдолу, новото е на мястото си от първия
              кадър. Иначе по-късото по височина (АВСТРАЛИЯ, най-дългото име с най-малък шрифт) стоеше горе в
              клетката, висока колкото старото, и „кацаше“ надолу, щом старото изчезне. */}
          <div className="grid items-end">
            <AnimatePresence initial={false}>
              <MorphWord key={slide.destination} slide={slide} reduced={reduceMotion} />
            </AnimatePresence>
          </div>
        </div>

        <div
          role="group"
          aria-label="Избор на дестинация"
          className="hero-enter pointer-events-auto flex w-fit items-center gap-1 sm:gap-3"
          style={{ animationDelay: '0.5s' }}
          // Докато мишката е върху управлението, не сменяме — да не „избяга“ кръгчето изпод курсора.
          onPointerEnter={e => { if (e.pointerType === 'mouse') setHoverPaused(true); }}
          onPointerLeave={() => setHoverPaused(false)}
          onKeyDown={e => {
            if (e.key === 'ArrowRight') next();
            if (e.key === 'ArrowLeft') prev();
          }}
        >
          <ArrowButton label="Предишна дестинация" onClick={prev}>
            <ChevronLeft size={22} strokeWidth={2.5} aria-hidden="true" />
          </ArrowButton>
          <ul className="flex items-start gap-1 sm:gap-3">
            {SLIDES.map((s, i) => (
              <li key={s.img}>
                <DestinationDot
                  slide={s}
                  active={i === current}
                  paused={paused}
                  userPaused={userPaused}
                  onSelect={() => changeTo(i)}
                  onTogglePause={() => setUserPaused(p => !p)}
                  onRingEnd={handleRingEnd}
                />
              </li>
            ))}
          </ul>
          <ArrowButton label="Следваща дестинация" onClick={next}>
            <ChevronRight size={22} strokeWidth={2.5} aria-hidden="true" />
          </ArrowButton>
        </div>
      </div>

      {/* За екранни четци: какво показва слайдът (обявява се само при пауза — иначе би говорило на всеки 10 s) */}
      <p className="sr-only" aria-live={paused ? 'polite' : 'off'}>
        {slide.destination}: {slide.blurb}
      </p>
    </section>
  );
}

// Една снимка. Новата влиза над старата: разтваря се кръгово от страната на глобуса, докато се
// изостря и леко отдалечава; старата отдолу бавно се приближава и притъмнява. При намалено движение —
// кръстосано избледняване (старата остава отдолу, докато новата се появи).
function PhotoLayer({
  slide, mode, isFirst, paused, reduced,
}: {
  slide: Slide;
  mode: ChangeMode;
  isFirst: boolean;
  paused: boolean;
  reduced: boolean;
}) {

  // custom = как е сменена снимката; за излизащата идва от AnimatePresence (вече новата стойност).
  // При 'slide' новата снимка вече стои на мястото си (доплъзгана е) — без разтваряне, старата изчезва веднага.
  const variants: Variants = {
    enter: (m: ChangeMode) => (m === 'slide'
      ? { opacity: 1, clipPath: 'circle(150% at 80% 75%)', scale: 1, filter: 'none', zIndex: 1 }
      : reduced
        ? { opacity: 0, zIndex: 1 }
        : { clipPath: 'circle(0% at 80% 75%)', scale: 1.14, filter: 'blur(12px) brightness(1.15)', zIndex: 1 }),
    show: (m: ChangeMode) => (m === 'slide' || reduced
      ? { opacity: 1, zIndex: 1, transition: { duration: m === 'slide' ? 0 : 0.6, ease: 'easeOut' } }
      : {
          clipPath: 'circle(150% at 80% 75%)', scale: 1, filter: 'blur(0px) brightness(1)', zIndex: 1,
          transition: { duration: MORPH, ease: EASE_IN_OUT },
        }),
    leave: (m: ChangeMode) => (m === 'slide'
      ? { opacity: 0, zIndex: 0, transition: { duration: 0 } }
      : reduced
        ? { opacity: 1, zIndex: 0, transition: { duration: 0.6 } }
        : { scale: 1.05, filter: 'blur(0px) brightness(0.45)', zIndex: 0, transition: { duration: MORPH, ease: EASE_IN_OUT } }),
  };

  return (
    <motion.div className="absolute inset-0 overflow-hidden" custom={mode} variants={variants} initial="enter" animate="show" exit="leave">
      {/* Бавно приближаване, докато дестинацията е на екран (спира заедно с паузата) */}
      <div
        className="hero-kenburns absolute inset-0"
        style={{ animationDuration: `${SLIDE_DURATION + 4000}ms`, animationPlayState: paused ? 'paused' : 'running' }}
      >
        <HeroPhoto slide={slide} priority={isFirst} />
      </div>
    </motion.div>
  );
}

// Снимката на дестинация. На широк екран (с глобуса) е по-широка от екрана и изместена така, че главното в нея
// (focus) да е вляво от глобуса; на телефон — нормално, с focus като хоризонтална позиция на изрязването.
function HeroPhoto({ slide, priority = false, children }: { slide: Slide; priority?: boolean; children?: React.ReactNode }) {
  return (
    <div
      className="absolute inset-y-0 left-0 w-full lg:[@media(min-height:640px)]:left-[var(--shift)] lg:[@media(min-height:640px)]:w-[var(--wide)]"
      style={{ '--shift': `${photoShift(slide.focus, slide.wide)}%`, '--wide': `${(slide.wide ?? PHOTO_WIDE) * 100}%` } as React.CSSProperties}
    >
      <Image
        src={slide.img}
        alt=""
        fill
        sizes={PHOTO_SIZES}
        quality={PHOTO_QUALITY}
        priority={priority}
        fetchPriority={priority ? 'high' : 'auto'}
        draggable={false}
        className="select-none object-cover"
        style={{ objectPosition: `${slide.focus * 100}% ${slide.focusY}%` }}
      />
      {children}
    </div>
  );
}

// Името на дестинацията. Буквите излизат нагоре и се размиват, новите изплуват отдолу една след друга.
// Двете думи стоят в една клетка на решетката, затова смяната не мести нищо около тях.
const LETTER: Variants = {
  enter: { y: '0.5em', opacity: 0, filter: 'blur(12px)' },
  show: { y: 0, opacity: 1, filter: 'blur(0px)', transition: { duration: 0.7, ease: EASE_OUT } },
  leave: { y: '-0.35em', opacity: 0, filter: 'blur(10px)', transition: { duration: 0.45, ease: EASE_IN_OUT } },
};
const LETTER_REDUCED: Variants = {
  enter: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5 } },
  leave: { opacity: 0, transition: { duration: 0.3 } },
};

function MorphWord({ slide, reduced }: { slide: Slide; reduced: boolean }) {
  const fontSize = `min(calc(100cqw / ${((slide.em - slide.lsb) * 1.01).toFixed(3)}), ${WORD_MAX})`;
  return (
    <motion.p
      className="whitespace-nowrap font-display font-bold uppercase text-white [grid-area:1/1]"
      style={{ fontSize, lineHeight: 0.86, letterSpacing: '-0.035em', marginLeft: `${-slide.lsb}em` }}
      initial="enter"
      animate="show"
      exit="leave"
      variants={{
        show: { transition: { staggerChildren: 0.04, delayChildren: 0.25 } },
        leave: { transition: { staggerChildren: 0.025 } },
      }}
    >
      {Array.from(slide.destination).map((ch, i) => (
        <motion.span key={i} className="inline-block" variants={reduced ? LETTER_REDUCED : LETTER}>
          {ch}
        </motion.span>
      ))}
    </motion.p>
  );
}

// Текстът за дестинацията. Стои горе вдясно, в ивицата между менюто и върха на глобуса — там обикновено е
// небе: не застъпва заглавието и бутона (горе вляво), главното в снимката (изместено вляво), името и
// кръгчетата (долу вляво), нито самия глобус. От точката на дестинацията (центъра на сферата) нагоре се
// изтегля златна линия до долния ръб на блока, после блокът се разтваря отдолу нагоре, а редовете изплуват.
// Всички позиции са спрямо героса и следват размера на глобуса (GLOBE_D):
//   точката — на 0.3·D от десния и долния ръб; върхът на сферата — на 0.8·D от долния ръб.
// Десният ръб на блока следва контейнера на менюто, но не минава вляво от точката (на много широк екран).
const NOTE_GAP = '1rem';

function GlobeNote({
  slide, localTime, reduced, onFilter,
}: {
  slide: Slide;
  localTime: string | null;
  reduced: boolean;
  onFilter: () => void;
}) {
  const line: Variants = {
    hidden: { scaleY: 0 },
    show: { scaleY: 1, transition: { duration: reduced ? 0 : 0.4, ease: EASE_OUT } },
    out: { scaleY: 0, transition: { duration: 0.2, delay: 0.15 } },
  };
  const box: Variants = reduced
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4 } }, out: { opacity: 0, transition: { duration: 0.2 } } }
    : {
        hidden: { clipPath: 'inset(100% 0% 0% 0% round 1.25rem)' },
        // Редовете изплуват, докато блокът още се отваря — иначе за миг се вижда празна тъмна кутия
        show: {
          clipPath: 'inset(0% 0% 0% 0% round 1.25rem)',
          transition: { delay: 0.3, duration: 0.5, ease: EASE_OUT, delayChildren: 0.4, staggerChildren: 0.06 },
        },
        out: { clipPath: 'inset(100% 0% 0% 0% round 1.25rem)', transition: { duration: 0.25, ease: EASE_IN_OUT } },
      };
  const row: Variants = reduced
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 6, filter: 'blur(6px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: EASE_OUT } } };

  return (
    <motion.div className="pointer-events-none absolute inset-0 z-[15]" initial="hidden" animate="show" exit="out">
      {/* Точката на дестинацията и линията от нея нагоре до блока */}
      <motion.span
        aria-hidden="true"
        className="absolute block h-[10px] w-[10px] rounded-full bg-[#f1d27a] shadow-[0_0_0_4px_rgba(0,0,0,0.55)]"
        style={{ right: `calc(${GLOBE_D} * 0.3 - 5px)`, bottom: `calc(${GLOBE_D} * 0.3 - 5px)` }}
        variants={{ hidden: { scale: 0 }, show: { scale: 1, transition: { duration: 0.25 } }, out: { scale: 0, transition: { duration: 0.2 } } }}
      />
      <motion.span
        aria-hidden="true"
        className="absolute block w-[1.5px] origin-bottom bg-[#f1d27a]"
        style={{
          right: `calc(${GLOBE_D} * 0.3 - 0.75px)`,
          bottom: `calc(${GLOBE_D} * 0.3)`,
          height: `calc(${GLOBE_D} * 0.5 + ${NOTE_GAP})`,
        }}
        variants={line}
      />

      <motion.div
        className="pointer-events-auto absolute w-[min(34rem,34vw)] rounded-[1.25rem] border border-white/15 bg-black/70 px-5 py-3 text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md [--edge:1.5rem] lg:[--edge:calc((100%-1024px)/2+1.5rem)] xl:[--edge:calc((100%-1280px)/2+1.5rem)] 2xl:[--edge:calc((100%-1536px)/2+1.5rem)]"
        style={{
          right: `min(var(--edge), calc(${GLOBE_D} * 0.3 - 3rem))`,
          bottom: `calc(${GLOBE_D} * 0.8 + ${NOTE_GAP})`,
        }}
        variants={box}
      >
        {/* Компактно, за да се побере в ивицата над глобуса: името и връзката на един ред, описанието,
            после часът и разстоянието на един малък ред */}
        <motion.div variants={row} className="flex items-center justify-between gap-4">
          <p className="font-display text-[1.25rem] font-semibold leading-none tracking-[-0.02em] text-[#f1d27a]">
            {slide.destination}
          </p>
          <button
            type="button"
            onClick={onFilter}
            className="inline-flex min-h-9 shrink-0 cursor-pointer items-center text-[14px] font-semibold text-white underline decoration-[#f1d27a] decoration-2 underline-offset-[6px] transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Екскурзии до {slide.destination}
          </button>
        </motion.div>
        <motion.p variants={row} className="mt-1 text-[13.5px] leading-snug text-white/90">
          {slide.blurb}
        </motion.p>
        <motion.p variants={row} className="mt-1.5 flex flex-wrap gap-x-4 text-[12.5px] text-white/65">
          {localTime && <span>В {slide.city} е {localTime}</span>}
          <span>{formatKm(slide.km)} от София</span>
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

// Кръгче с дестинация: снимка + обръч. Активното показва прогреса до следващата смяна; натискане върху него
// спира/пуска автоматичната смяна (WCAG 2.2.2). Обръчът продължава и при намалено движение — той отмерва
// времето, а смяната тогава е кратко избледняване.
function DestinationDot({
  slide, active, paused, userPaused, onSelect, onTogglePause, onRingEnd,
}: {
  slide: Slide;
  active: boolean;
  paused: boolean;
  userPaused: boolean;
  onSelect: () => void;
  onTogglePause: () => void;
  onRingEnd: () => void;
}) {
  const label = active
    ? `${slide.destination}: ${userPaused ? 'пусни' : 'спри'} автоматичната смяна`
    : `Покажи ${slide.destination}`;
  return (
    <button
      type="button"
      onClick={active ? onTogglePause : onSelect}
      aria-label={label}
      aria-current={active}
      className="group flex cursor-pointer touch-manipulation flex-col items-center gap-1.5 rounded-full sm:w-[4.75rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:rounded-2xl"
    >
      <span className="relative block h-10 w-10 sm:h-14 sm:w-14">
        <span className="absolute inset-[4px] overflow-hidden rounded-full bg-white/20 transition-transform duration-200 ease-out group-hover:scale-[1.07] group-active:scale-95">
          <Image src={slide.img} alt="" fill sizes="64px" quality={40} className="object-cover" />
        </span>
        <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="24" cy="24" r="22.5" fill="none" stroke="white" strokeOpacity={active ? 0.35 : 0.5} strokeWidth="2" />
        </svg>
        {active && <HeroRing key={slide.img} duration={SLIDE_DURATION} paused={paused} onEnd={onRingEnd} />}
      </span>
      <span className={`hidden text-[13px] leading-none text-white sm:block lg:[@media(max-height:780px)]:hidden ${active ? 'font-bold' : 'font-medium'}`}>
        {slide.destination}
      </span>
    </button>
  );
}

// Стрелка — бял плътен кръг, видим върху всяка снимка. Реагира още при натискане.
function ArrowButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-10 w-10 shrink-0 cursor-pointer touch-manipulation place-items-center rounded-full bg-white text-brand-dark transition-transform duration-150 ease-out hover:scale-[1.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-90 sm:h-12 sm:w-12"
    >
      {children}
    </button>
  );
}
