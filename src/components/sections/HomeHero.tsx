"use client";

import { useSyncExternalStore } from 'react';
import Hero, { STAGE_QUERY } from './Hero';
import HeroClassic from './HeroClassic';

// Героят на началната страница. Телефон, таблет и нисък екран — HeroClassic (дизайнът отпреди глобуса); широк и
// висок екран — Hero с глобуса. Сървърът не знае размера на екрана, затова в HTML-а са и двата и CSS показва единия
// (без премигване). Веднага след зареждането скритият се маха: иначе framer-motion продължава да анимира текста му
// (размазване буква по буква) и на телефон това ядеше процесора, докато потребителят чака първия екран.
function subscribe(cb: () => void) {
  const mq = window.matchMedia(STAGE_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
const getStage = () => window.matchMedia(STAGE_QUERY).matches;
// null = още не знаем (сървърът и първото рендиране в браузъра) — тогава са и двата, като в HTML-а
const getServerStage = () => null;

export default function HomeHero() {
  const stage = useSyncExternalStore<boolean | null>(subscribe, getStage, getServerStage);

  return (
    <>
      {stage !== true && (
        <div className="lg:[@media(min-height:640px)]:hidden">
          <HeroClassic />
        </div>
      )}
      {stage !== false && (
        <div className="hidden lg:[@media(min-height:640px)]:block">
          <Hero />
        </div>
      )}
    </>
  );
}
