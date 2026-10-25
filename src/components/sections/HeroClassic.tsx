"use client";

// Героса за телефон, таблет и нисък екран — дизайнът отпреди глобуса (по желание на собственика). На широк и
// висок екран се показва Hero.tsx с глобуса; page.tsx рендира и двата и CSS скрива единия. Скритият
// „спи“: не сменя слайдове и не показва подсказки.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { AnimatePresence, animate, motion, useMotionValue, type MotionValue, type PanInfo } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { glideToElement } from '@/lib/smoothScroll';
import HeroRing from './HeroRing';
import { useVisitorEngaged } from '@/lib/hooks/useVisitorEngaged';
import Link from 'next/link';

const SOFIA = { lat: 42.6977, lon: 23.3219 };

// Разстояние по права линия от София (km, закръглено до 50). Изчислява се еднакво на сървъра и клиента.
function kmFromSofia(lat: number, lon: number) {
  const r = Math.PI / 180;
  const dLat = (lat - SOFIA.lat) * r;
  const dLon = (lon - SOFIA.lon) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(SOFIA.lat * r) * Math.cos(lat * r) * Math.sin(dLon / 2) ** 2;
  return Math.round((6371 * 2 * Math.asin(Math.sqrt(a))) / 50) * 50;
}
const formatKm = (km: number) => `${Math.floor(km / 1000)} ${String(km % 1000).padStart(3, '0')} км`;

// color — цветното поле под снимката, взето от самото място (морето, пристанището, лака, планината, залеза).
//   Всички са достатъчно тъмни за бял текст (контраст ≥ 4.5:1).
// em — ширината на името (главни букви, Unbounded 700, letter-spacing -0.035em), измерена в браузър; по нея
//   надписът запълва точно ширината на контейнера. lsb — празното място пред първата буква (в em), с което
//   буквата се изтегля наляво за оптическо подравняване. При ново име — и двете се измерват отново.
// city/timeZone/lat/lon — за местното време и разстоянието от София.
// cropX — хоризонталната позиция на изрязването (object-position). Телефонът вижда около четвърт от ширината на
//   хоризонтална снимка, затова при всяка е избрано място, където е главното — не просто средата.
// photoTop + sky — по желание, когато главното е широко и ниско в снимката (лодката в Тайланд): снимката не е по
//   цялата височина, а започва от photoTop и свършва малко под горния ръб на полето, така че се вижда по-широко
//   парче от нея. Отгоре небето ѝ продължава с цветовете sky (взети от горния ѝ край — отляво и отдясно).
const SLIDES = [
  {
    destination: 'Мексико',
    subtitle: 'Пирамидите на маите и карибските плажове',
    img: '/hero/mexico.webp',
    cropX: 50,
    filterHref: '/?country=meksiko#tours-grid',
    em: 6.307,
    lsb: 0.06,
    color: '#2E6B3F',
    city: 'Мексико Сити',
    timeZone: 'America/Mexico_City',
    lat: 19.4326,
    lon: -99.1332,
  },
  {
    destination: 'Перу',
    subtitle: 'Мачу Пикчу и изгубените цивилизации',
    img: '/hero/peru2.jpg',
    cropX: 53,
    filterHref: '/?country=peru#tours-grid',
    em: 3.274,
    lsb: 0.06,
    color: '#9E1F63',
    city: 'Куско',
    timeZone: 'America/Lima',
    lat: -13.532,
    lon: -71.9675,
  },
  {
    destination: 'Китай',
    subtitle: 'Хиляди години история и модерни чудеса',
    img: '/hero/china2.jpg',
    cropX: 47,
    filterHref: '/?country=kitay#tours-grid',
    em: 4.316,
    lsb: 0.06,
    color: '#B3121F',
    city: 'Пекин',
    timeZone: 'Asia/Shanghai',
    lat: 39.9042,
    lon: 116.4074,
  },
  {
    destination: 'Австралия',
    subtitle: 'Природа без граници, приключения без край',
    img: '/hero/australia3.jpg',
    cropX: 66,
    filterHref: '/?country=avstraliya#tours-grid',
    em: 7.773,
    lsb: -0.01,
    color: '#0B4F9C',
    city: 'Сидни',
    timeZone: 'Australia/Sydney',
    lat: -33.8688,
    lon: 151.2093,
  },
  {
    destination: 'Тайланд',
    subtitle: 'Храмове, плажове и незабравими залези',
    img: '/hero/thailand2.jpg',
    cropX: 18,
    photoTop: '18%',
    sky: ['#4c6fb0', '#889aba'],
    filterHref: '/?country=tayland#tours-grid',
    em: 6.351,
    lsb: 0.01,
    color: '#00737A',
    city: 'Банкок',
    timeZone: 'Asia/Bangkok',
    lat: 13.7563,
    lon: 100.5018,
  },
].map(s => ({ ...s, km: kmFromSofia(s.lat, s.lon) }));

type Slide = (typeof SLIDES)[number];

// 24-часов формат без „ч.“ (bg-BG го добавя).
const TIME_FORMATS = SLIDES.map(s => new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: s.timeZone,
}));

// Еднакви с Hero.tsx — двата героса са в страницата едновременно и така свалят една и съща снимка, не две.
const PHOTO_SIZES = '130vw';
const SKY_FADE = 'linear-gradient(to bottom, transparent, #000 2.5rem)';

// Колко стои всяка дестинация.
const SLIDE_DURATION = 8000;
// „Следващата надниква“ отдясно — подсказка, че снимките се сменят и могат да се дърпат. На всеки слайд:
// влиза на PEEK_AT, стои PEEK_SHOW (от PEEK_PULSE_AFTER нататък пулсира), после се връща.
// Времевата линия е и в hero-streak / hero-teaser в globals.css — при промяна се сменят и там.
const PEEK_AT = 4000;
const PEEK_IN = 0.5;
const PEEK_PULSE_AFTER = 1.0;
const PEEK_SHOW = 2.5;
const PEEK_OUT = 0.45;
const PEEK_TOTAL = PEEK_SHOW + PEEK_OUT;
// Минимална част от ширината, която жестът трябва да „отнесе“ (с проектиран momentum), за да смени слайда.
const COMMIT_RATIO = 0.3;
// Таван за височината на надписа — късите имена (Перу) иначе биха заели половин екран.
const WORD_MAX = '27svh';
// Отстъп над съдържанието в цветното поле: долната половина на най-голямото възможно име + въздух.
const BAND_PAD = `calc(min(${WORD_MAX}, (100vw - 3rem) / 3.25) * 0.43 + 0.75rem)`;
// Плътност на цветното поле (върху снимка, притъмнена с 40% черно). Под 0.78 белият текст губи контраст.
const BAND_OPACITY = 0.78;
// Паралакс при влачене: снимката изостава, името изпреварва.
const IMG_PARALLAX = 0.12;
const WORD_PARALLAX = 0.35;

// Spring без отскок — прекъсваем и наследява скоростта на жеста.
const springTo = (duration: number, velocity = 0) => ({ type: 'spring' as const, bounce: 0, duration, velocity });

// Проекция на мястото, където жестът би спрял (exponential decay, decelerationRate 0.998).
function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

// Позиция в кръга спрямо текущия слайд: -2..2 (при 5 слайда).
function ringOffset(i: number, current: number, n: number) {
  let d = (i - current) % n;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

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

type Jump = { target: number; dir: 1 | -1 };

export default function HeroClassic() {
  const reduceMotion = useMedia('(prefers-reduced-motion: reduce)');
  // На широк и висок екран се вижда Hero.tsx — тогава този спи (на сървъра е буден: първо идва телефонът)
  const active = !useMedia('(min-width: 1024px) and (min-height: 640px)');
  const minute = useSyncExternalStore(subscribeMinute, getMinute, getMinuteServer);

  const [current, setCurrent] = useState(0);
  // Скок към несъседна дестинация: целта временно заема мястото на съседа от съответната страна,
  // за да се плъзне като обикновена смяна (без да „прелита“ през пропуснатите).
  const [jump, setJump] = useState<Jump | null>(null);
  const jumpRef = useRef<Jump | null>(null);
  // Съседните слайдове се монтират малко след първия кадър, за да не си конкурират трафика с LCP снимката;
  // останалите — малко по-късно. Така всяка снимка е заредена, преди да потрябва (иначе при смяна или
  // скок към далечна дестинация за миг се вижда тъмен фон).
  const [neighborsReady, setNeighborsReady] = useState(false);
  const [allReady, setAllReady] = useState(false);
  // При намалено движение смяната е кръстосано избледняване: старият слайд остава отдолу, докато новият
  // се появи върху него — без тъмен кадър помежду им.
  const [fadeFrom, setFadeFrom] = useState<number | null>(null);
  const currentRef = useRef(0);
  // Подсказката „следващата надниква“: 'slide' — трактът се дръпва леко наляво и се връща;
  // 'fade' (намалено движение) — ивица от следващата снимка се показва за миг в десния край.
  const [peek, setPeek] = useState<'slide' | 'fade' | null>(null);
  // Докъде е стигнала смяната: щом идващият слайд мине средата, текстът и кръгчетата вече са за него.
  const [shownDir, setShownDir] = useState<0 | 1 | -1>(0);
  // Входната анимация (цветното поле изплува отдолу) е само за първото показване.
  const [introDone, setIntroDone] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);

  // Източници на пауза. Слайдшоуто върви само когато НИТО ЕДИН от тях не е активен (WCAG 2.2.2).
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [inView, setInView] = useState(true);
  // Автоматичната смяна тръгва след първия скрол/докосване/клавиш на посетителя — виж useVisitorEngaged
  const engaged = useVisitorEngaged();
  const paused = userPaused || hoverPaused || focusPaused || dragging || tabHidden || !inView || !active || !engaged;

  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);
  const anim = useRef<ReturnType<typeof animate> | null>(null);
  const committing = useRef(false);
  // Подсказката не излиза, ако посетителят е спрял смяната, влачи, или секцията не се вижда.
  // Мишката върху кръгчетата НЕ я спира (спира само самата смяна).
  const peekBlocked = useRef(false);

  useLayoutEffect(() => {
    currentRef.current = current;
  }, [current]);

  useLayoutEffect(() => {
    peekBlocked.current = userPaused || dragging || tabHidden || !inView || !active || !engaged;
  }, [userPaused, dragging, tabHidden, inView, active, engaged]);

  useEffect(() => dragX.on('change', v => {
    const w = trackRef.current?.offsetWidth ?? 0;
    if (w) setShownDir(v < -w / 2 ? 1 : v > w / 2 ? -1 : 0);
  }), [dragX]);

  useEffect(() => {
    // Без да чакаме събитието load: на телефон то идва късно (всички снимки по страницата) и при плъзгане
    // следващата снимка още не беше дошла. Първото докосване/скрол монтира съседите веднага (виж neighborsShown).
    const t1 = setTimeout(() => setNeighborsReady(true), 2000);
    const t2 = setTimeout(() => setAllReady(true), 4500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  const neighborsShown = neighborsReady || engaged;

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

  // Ширината на тракта — за паралакса на снимката и името.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTrackWidth(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Смяна към съседен слайд (dir = +1 следващ, -1 предишен). Анимира се ТРАКТЪТ (dragX) до ±ширината, а в края
  // current се сменя и dragX се връща в 0 в същия кадър (flushSync) — слайдовете са позиционирани спрямо current,
  // затова няма видим скок. Ако има „скок“ в същата посока, целта вече стои на мястото на съседа.
  // byHand: смяна, започната с жест — тя винаги довършва плъзгането до другия край (и при намалено
  // движение), защото ръката вече е задвижила снимката. Автоматичната смяна и бутоните при намалено
  // движение са кръстосано избледняване.
  const commit = useCallback((dir: 1 | -1, velocity = 0, byHand = false) => {
    const track = trackRef.current;
    if (!track) return;
    anim.current?.stop();
    committing.current = true;
    setPeek(null);
    const j = jumpRef.current;
    const target = j && j.dir === dir ? j.target : null;
    const crossfade = reduceMotion && !byHand;
    const finish = () => {
      const from = currentRef.current;
      flushSync(() => {
        setFadeFrom(crossfade ? from : null);
        setCurrent(target ?? (from + dir + SLIDES.length) % SLIDES.length);
        setShownDir(0);
        jumpRef.current = null;
        setJump(null);
        setIntroDone(true);
      });
      dragX.set(0);
      committing.current = false;
    };
    if (crossfade) {
      finish();
      return;
    }
    anim.current = animate(dragX, -dir * track.offsetWidth, {
      ...springTo(0.6, velocity),
      onComplete: finish,
    });
  }, [dragX, reduceMotion]);

  const next = useCallback(() => {
    setNeighborsReady(true);
    if (!committing.current) commit(1);
  }, [commit]);
  const prev = useCallback(() => {
    setNeighborsReady(true);
    if (!committing.current) commit(-1);
  }, [commit]);

  const goTo = useCallback((i: number) => {
    if (i === current || committing.current) return;
    setNeighborsReady(true);
    // Посоката следва реда на кръгчетата: вдясно → идва отдясно.
    const dir: 1 | -1 = i > current ? 1 : -1;
    if (ringOffset(i, current, SLIDES.length) !== dir) {
      const j = { target: i, dir };
      jumpRef.current = j;
      flushSync(() => setJump(j));
    }
    commit(dir);
  }, [commit, current]);

  // „Следващата надниква“: на PEEK_AT от всеки слайд следващата снимка влиза малко отдясно, след секунда
  // започва да „дърпа“ (пулсира), а след PEEK_SHOW се връща — с линии на шева. Подсказва и че предстои
  // смяна, и че снимката се дърпа отстрани. Повтаря се на всеки слайд.
  useEffect(() => {
    const t = setTimeout(() => {
      if (peekBlocked.current || committing.current || dragX.get() !== 0) return;
      setNeighborsReady(true);
      if (reduceMotion) {
        setPeek('fade');
        return;
      }
      const w = trackRef.current?.offsetWidth ?? 0;
      const a = -Math.min(130, Math.max(64, w * 0.09));
      const pull = a * 1.3;
      const pulse = (PEEK_SHOW - 0.18 - PEEK_PULSE_AFTER) / 6;
      const at = [
        0, PEEK_IN, PEEK_PULSE_AFTER,
        PEEK_PULSE_AFTER + pulse, PEEK_PULSE_AFTER + pulse * 2,
        PEEK_PULSE_AFTER + pulse * 3, PEEK_PULSE_AFTER + pulse * 4,
        PEEK_PULSE_AFTER + pulse * 5, PEEK_PULSE_AFTER + pulse * 6,
        PEEK_SHOW, PEEK_TOTAL,
      ];
      const out: [number, number, number, number] = [0.22, 1, 0.36, 1];
      const inOut: [number, number, number, number] = [0.45, 0, 0.55, 1];
      setPeek('slide');
      anim.current = animate(dragX, [0, a, a, pull, a, pull, a, pull, a, a, 0], {
        duration: PEEK_TOTAL,
        times: at.map(s => s / PEEK_TOTAL),
        ease: [out, 'linear', inOut, inOut, inOut, inOut, inOut, inOut, 'linear', [0.65, 0, 0.35, 1]],
        onComplete: () => setPeek(null),
      });
    }, PEEK_AT);
    return () => clearTimeout(t);
  }, [current, reduceMotion, dragX]);

  const handleDragStart = () => {
    setNeighborsReady(true);
    setPeek(null);
    setDragging(true);
    // Хващане по време на анимация: спираме я и продължаваме от текущата позиция.
    anim.current?.stop();
    committing.current = false;
  };

  const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    setDragging(false);
    const width = trackRef.current?.offsetWidth ?? window.innerWidth;
    const v = info.velocity.x;
    const projected = dragX.get() + project(v);
    if (projected < -width * COMMIT_RATIO) commit(1, v, true);
    else if (projected > width * COMMIT_RATIO) commit(-1, v, true);
    else anim.current = animate(dragX, 0, springTo(0.45, v));
  };

  // JS-контролиран скрол: нативната hash-навигация на iOS Safari се бие със CSS smooth scroll.
  const scrollToTours = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    glideToElement(document.getElementById('tours-grid'));
  }, []);

  // Дестинацията, за която са текстът и кръгчетата — по време на плъзгане сменя се още в средата.
  const shown = shownDir === 0
    ? current
    : jump && jump.dir === shownDir ? jump.target : (current + shownDir + SLIDES.length) % SLIDES.length;
  const slide = SLIDES[shown];
  const nextSlide = SLIDES[(current + 1) % SLIDES.length];
  const localTime = minute < 0 ? null : TIME_FORMATS[shown].format(minute * 60000);

  // Къде стои всеки слайд (в ширини от текущия): текущият в 0, съседите на ±1, далечните на ±2 (извън екрана,
  // но заредени), целта на скок — на мястото на съседа. null = още не е в DOM.
  const slideOffset = (i: number): number | null => {
    if (i === current || i === fadeFrom) return 0;
    if (jump && i === jump.target) return jump.dir;
    const off = ringOffset(i, current, SLIDES.length);
    if (jump && off === jump.dir) return off * 2;
    if (Math.abs(off) === 1) return neighborsShown ? off : null;
    return allReady ? off : null;
  };

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label="Дестинации на Beliva VIP Tour"
      className="relative isolate h-[100svh] min-h-[34rem] overflow-hidden bg-brand-dark text-white [--band:15.5rem] sm:[--band:36%] lg:[--band:34%] lg:[@media(min-height:820px)]:[--band:31%]"
      onFocus={e => { if (e.target.matches(':focus-visible')) setFocusPaused(true); }}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocusPaused(false); }}
    >
      {/* ─── ТРАКТ: снимка + цветно поле + име за всяка дестинация. Влачи се 1:1 с пръста;
           touch-action: pan-y запазва вертикалния скрол. ─── */}
      <motion.div
        ref={trackRef}
        drag="x"
        dragMomentum={false}
        dragElastic={0}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ x: dragX, touchAction: 'pan-y' }}
        className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
      >
        {SLIDES.map((s, i) => {
          const offset = slideOffset(i);
          if (offset === null) return null;
          return (
            <HeroSlide
              key={s.img}
              slide={s}
              offset={offset}
              isCurrent={i === current}
              isFirst={i === 0}
              intro={i === 0 && !introDone}
              // Новият слайд избледнява ВЪРХУ стария (fadeFrom стои отдолу), не върху тъмния фон.
              layer={i === current ? 2 : i === fadeFrom ? 1 : 0}
              fadeIn={i === current && fadeFrom !== null}
              onFadeEnd={() => setFadeFrom(null)}
              streaks={peek === 'slide' && i === current}
              fadingOut={i === fadeFrom}
              paused={paused}
              parallax={!reduceMotion}
              dragX={dragX}
              width={trackWidth}
            />
          );
        })}
      </motion.div>

      {/* ─── СЪДЪРЖАНИЕ. pointer-events-none, за да може жестът да минава през текста; само интерактивните са auto. ─── */}
      <div className="pointer-events-none relative z-10 h-full">
        {/* Горе, върху снимката: какво правим и двете действия */}
        <div className="container mx-auto px-6 pt-24 lg:pt-28 lg:[@media(max-height:780px)]:pt-24">
          <h1
            className="hero-enter max-w-[11.8em] font-display font-normal text-white"
            style={{
              fontSize: 'min(3.25rem, (100vw - 3rem) / 11.4)',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              animationDelay: '0.05s',
            }}
          >
            Групови екскурзии по света с водач
          </h1>

          <p
            className="hero-enter mt-4 hidden max-w-[34rem] text-lg leading-relaxed text-white sm:[@media(min-height:781px)]:block"
            style={{ animationDelay: '0.12s' }}
          >
            Подбираме най-добрите екскурзии на българския пазар и ви съпровождаме от първото запитване до завръщането.
          </p>

          <div className="hero-enter mt-5 lg:mt-7" style={{ animationDelay: '0.18s' }}>
            {/* Главното действие на страницата — единственият плътен златен бутон (в менюто „Запитване“ е с контур).
                По-голям, със златно сияние и тъмносиня стрелка; след появата на героса през него минава отблясък
                два пъти (.hero-cta-shine в globals.css; без него при „намалено движение“). */}
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

        {/* Долу, в цветното поле: за дестинацията и управлението */}
        <div className="absolute inset-x-0 bottom-0 h-[var(--band)]">
          <div
            className="container mx-auto flex h-full flex-col px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-8"
            style={{ paddingTop: BAND_PAD }}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
              {/* Текстът се сменя с кръстосано преливане: старият и новият са в една клетка и единият избледнява,
                  докато другият се появява — без момент, в който да няма текст (иначе „премигва“). */}
              <div aria-live={paused ? "polite" : "off"} className="order-2 grid min-w-0 lg:order-1">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={shown}
                    className="[grid-area:1/1]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  >
                    <p className="text-base font-semibold leading-snug sm:text-lg lg:text-2xl lg:font-medium lg:tracking-[-0.01em]">
                      {slide.subtitle}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-5 text-sm text-white lg:mt-2 lg:text-[15px]">
                      {localTime && <span>В {slide.city} е {localTime}</span>}
                      <span className="hidden min-[380px]:inline">{formatKm(slide.km)} от София</span>
                      <Link
                        href={slide.filterHref}
                        className="cursor-pointer touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white pointer-events-auto hidden min-h-11 items-center font-semibold text-white underline decoration-2 underline-offset-[6px] transition-opacity hover:opacity-80 lg:inline-flex"
                      >
                        Екскурзии до {slide.destination}
                      </Link>
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div
                role="group"
                aria-label="Избор на дестинация"
                className="hero-enter pointer-events-auto order-1 flex items-center gap-1 self-start sm:gap-3 lg:order-2 lg:shrink-0"
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
                <ul className="flex items-start gap-1 sm:gap-3 lg:gap-4">
                  {SLIDES.map((s, i) => (
                    <li key={s.img}>
                      <DestinationDot
                        slide={s}
                        active={i === shown}
                        paused={paused}
                        userPaused={userPaused}
                        onSelect={() => goTo(i)}
                        onTogglePause={() => setUserPaused(p => !p)}
                        onRingEnd={next}
                      />
                    </li>
                  ))}
                </ul>
                <ArrowButton label="Следваща дестинация" onClick={next}>
                  <ChevronRight size={22} strokeWidth={2.5} aria-hidden="true" />
                </ArrowButton>
              </div>
            </div>

            {/* На телефон и таблет линкът стои най-долу, по средата — между бутоните за бисквитки и чата */}
            <div className="mt-auto grid justify-items-center lg:hidden">
              <AnimatePresence initial={false}>
                <motion.div
                  key={shown}
                  className="[grid-area:1/1]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <Link
                    href={slide.filterHref}
                    className="cursor-pointer touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white pointer-events-auto inline-flex min-h-11 items-center text-sm font-semibold text-white underline decoration-2 underline-offset-[6px] sm:text-[15px]"
                  >
                    Екскурзии до {slide.destination}
                  </Link>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* „Следващата надниква“ при намалено движение: без плъзгане — ивица от следващата дестинация
           (снимка + цвят) се показва за миг в десния край, с линиите до нея. */}
      {peek === 'fade' && (
        <div
          aria-hidden="true"
          className="hero-teaser pointer-events-none absolute inset-y-0 right-0 z-[5] w-16 sm:w-24"
          style={{ animationDuration: `${PEEK_TOTAL}s` }}
          onAnimationEnd={e => { if (e.target === e.currentTarget) setPeek(null); }}
        >
          <div className="absolute inset-x-0 bottom-[var(--band)] top-0 overflow-hidden">
            <Image src={nextSlide.img} alt="" fill sizes="96px" quality={75} className="object-cover" />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[var(--band)] bg-black">
            <div className="absolute inset-0" style={{ backgroundColor: nextSlide.color, opacity: BAND_OPACITY }} />
          </div>
          <Streaks animated={false} />
        </div>
      )}
    </section>
  );
}

// Един слайд: снимка, цветно поле и името на дестинацията на шева между тях.
// Позиционира се с left: offset*100% спрямо тракта. Паралаксът се смята от реалната позиция на слайда
// (offset*ширина + dragX), която не се променя при смяната на current — затова и паралаксът няма скок.
function HeroSlide({
  slide, offset, isCurrent, isFirst, intro, layer, fadeIn, onFadeEnd, streaks, fadingOut, paused, parallax, dragX, width,
}: {
  slide: Slide;
  offset: number;
  isCurrent: boolean;
  isFirst: boolean;
  intro: boolean;
  layer: number;
  fadeIn: boolean;
  onFadeEnd: () => void;
  streaks: boolean;
  fadingOut: boolean;
  paused: boolean;
  parallax: boolean;
  dragX: MotionValue<number>;
  width: number;
}) {
  const imgX = useMotionValue(0);
  const wordX = useMotionValue(0);

  // useLayoutEffect: при смяна на слайда (flushSync) новият offset е в сила, преди dragX да се върне в 0.
  useLayoutEffect(() => {
    const update = (v: number) => {
      const p = offset * width + v;
      imgX.set(parallax ? -p * IMG_PARALLAX : 0);
      wordX.set(parallax ? p * WORD_PARALLAX : 0);
    };
    update(dragX.get());
    return dragX.on('change', update);
  }, [dragX, offset, width, parallax, imgX, wordX]);

  const fontSize = `min(calc(100cqw / ${((slide.em - slide.lsb) * 1.01).toFixed(3)}), ${WORD_MAX})`;

  return (
    <div
      className="absolute top-0 h-full w-full"
      style={{ left: `${offset * 100}%`, zIndex: layer }}
      aria-hidden="true"
    >
      {/* Снимката — по цялата височина (прозира през полето) и малко по-широка, за да има място за паралакса.
          При намалено движение новата снимка и полето избледняват върху старите, а името се сменя веднага —
          ако избледняваше и то, за миг не би се чело нито старото, нито новото (премигване). */}
      <div
        className={`absolute inset-0 overflow-hidden ${fadeIn ? 'hero-crossfade' : ''}`}
        onAnimationEnd={e => { if (fadeIn && e.target === e.currentTarget) onFadeEnd(); }}
      >
        <motion.div
          className="absolute inset-y-0 -inset-x-[12%]"
          style={{ x: imgX, background: slide.sky ? `linear-gradient(to right, ${slide.sky[0]}, ${slide.sky[1]})` : undefined }}
        >
          {/* Бавно приближаване, докато дестинацията е на екран (спира заедно с паузата) */}
          <div
            className={`absolute inset-0 ${isCurrent ? 'hero-kenburns' : ''}`}
            style={{
              animationDuration: `${SLIDE_DURATION + 2000}ms`,
              animationPlayState: paused ? 'paused' : 'running',
              ...(slide.photoTop ? { top: slide.photoTop, bottom: 'calc(var(--band) - 1.25rem)' } : {}),
            }}
          >
            <Image
              src={slide.img}
              alt=""
              fill
              sizes={PHOTO_SIZES}
              quality={75}
              priority={isFirst}
              loading="eager"
              fetchPriority={isFirst ? 'high' : 'auto'}
              draggable={false}
              className="select-none object-cover"
              style={{
                objectPosition: `${slide.cropX}% 40%`,
                // Горният ръб на снимката се слива с небето отгоре (photoTop)
                ...(slide.photoTop ? { maskImage: SKY_FADE, WebkitMaskImage: SKY_FADE } : {}),
              }}
            />
          </div>
        </motion.div>
        {/* Неутрални затъмнения: горе — под менюто и заглавието; долу — под горната половина на името */}
        <div className="absolute inset-x-0 top-0 h-3/4 bg-gradient-to-b from-black/60 via-black/25 to-transparent" /* taste-skill-ignore: неутрално затъмнение върху снимка */ />
        <div className="absolute inset-x-0 bottom-[var(--band)] h-1/4 bg-gradient-to-t from-black/45 to-transparent" /* taste-skill-ignore: неутрално затъмнение върху снимка */ />
      </div>

      {/* Цветното поле на дестинацията — полупрозрачно върху притъмнената снимка: цветът остава наситен,
          но не крещи, а снимката леко прозира. Тъмният слой отдолу пази контраста на белия текст (≥ 4.5:1). */}
      <div className={`absolute inset-x-0 bottom-0 h-[var(--band)] ${intro ? 'hero-intro-band' : ''} ${fadeIn ? 'hero-crossfade' : ''}`}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0" style={{ backgroundColor: slide.color, opacity: BAND_OPACITY }} />
      </div>

      {/* Линиите в десния край, докато следващият слайд „надниква“ — движат се заедно с тракта */}
      {streaks && <Streaks animated inside />}

      {/* Името — на шева между снимката и полето, запълва ширината на контейнера */}
      <div className="container absolute inset-x-0 bottom-[var(--band)] mx-auto px-6">
        <div className="translate-y-1/2 [container-type:inline-size]">
          <div className={intro ? 'hero-intro-word' : fadingOut ? 'invisible' : undefined}>
            <motion.p
              className="whitespace-nowrap font-display font-bold uppercase text-white"
              style={{
                x: wordX,
                fontSize,
                lineHeight: 0.86,
                letterSpacing: '-0.035em',
                marginLeft: `${-slide.lsb}em`,
              }}
            >
              {slide.destination}
            </motion.p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Кръгче с дестинация: снимка + обръч. Активното показва прогреса до следващата смяна; натискане върху него
// спира/пуска автоматичната смяна (WCAG 2.2.2). Обръчът продължава и при намалено движение — той отмерва
// времето, а смяната тогава е кратко избледняване, не плъзгане.
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
      className="group flex cursor-pointer touch-manipulation flex-col items-center gap-1.5 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:rounded-2xl"
    >
      <span className="relative block h-10 w-10 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
        <span className="absolute inset-[4px] overflow-hidden rounded-full bg-white/20 transition-transform duration-200 ease-out group-hover:scale-[1.07] group-active:scale-95">
          <Image src={slide.img} alt="" fill sizes="64px" quality={40} className="object-cover" style={{ objectPosition: `${slide.cropX}% 50%` }} />
        </span>
        <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="24" cy="24" r="22.5" fill="none" stroke="white" strokeOpacity={active ? 0.35 : 0.5} strokeWidth="2" />
        </svg>
        {active && <HeroRing key={slide.img} duration={SLIDE_DURATION} paused={paused} onEnd={onRingEnd} />}

      </span>
      <span className={`hidden text-[13px] leading-none text-white sm:block lg:text-sm lg:[@media(max-height:780px)]:hidden ${active ? 'font-bold' : 'font-medium'}`}>
        {slide.destination}
      </span>
    </button>
  );
}

// Стрелка — бял плътен кръг, видим върху всеки цвят на полето. Реагира още при натискане.
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

// Линиите на шева: три къси черти, които подсказват посоката на смяната (отдясно наляво).
// Стоят вляво от ръба на следващия слайд и се движат с него.
function Streaks({ animated, inside = false }: { animated: boolean; inside?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute top-[calc((100%_-_var(--band))*0.72)] flex ${inside ? 'right-6' : 'right-full mr-4'} -translate-y-1/2 flex-col items-end gap-2`}
    >
      {[30, 48, 22].map((w, k) => (
        <span
          key={k}
          className={`block h-[3px] rounded-full bg-white ${animated ? 'hero-streak' : ''}`}
          style={{ width: w, animationDelay: `${k * 80}ms`, animationDuration: `${PEEK_TOTAL}s` }}
        />
      ))}
    </span>
  );
}
