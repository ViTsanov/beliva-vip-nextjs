import type { AnimationEvent } from 'react';

// Обръчът за прогрес около активната дестинация в героса (Hero.tsx и HeroClassic.tsx): бяла линия, която за
// duration ms обикаля по часовника отгоре; краят ѝ сменя слайда (onEnd).
// Преди беше SVG с анимиран stroke-dashoffset — браузърът не може да го даде на видеокартата и прерисуваше
// страницата на всеки кадър, без край (обръчът тръгва отначало с всеки слайд). На телефон това беше главната
// причина за бавния резултат в Lighthouse. Сега две половини на обръча се ВЪРТЯТ (transform) зад неподвижни
// маски — първата половина за първата половина от времето, втората след нея.
const HALF_RING = (
  <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full" aria-hidden="true">
    <circle cx="24" cy="24" r="22.5" fill="none" stroke="white" strokeWidth="3" />
  </svg>
);

export default function HeroRing({ duration, paused, onEnd }: { duration: number; paused: boolean; onEnd: () => void }) {
  const half = duration / 2;
  const timing = (delay: number) => ({
    animationDuration: `${half}ms`,
    animationDelay: `${delay}ms`,
    animationPlayState: paused ? 'paused' : 'running',
  });
  const onSecondEnd = (e: AnimationEvent) => {
    if (e.target === e.currentTarget) onEnd();
  };

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {/* Дясната половина (12 → 6 часа): лявата половина на обръча се завърта в нея */}
      <span className="absolute inset-0 [clip-path:inset(0_0_0_50%)]">
        <span className="hero-ring-half absolute inset-0 [clip-path:inset(0_50%_0_0)]" style={timing(0)}>
          {HALF_RING}
        </span>
      </span>
      {/* Лявата половина (6 → 12 часа): дясната половина на обръча, след първата */}
      <span className="absolute inset-0 [clip-path:inset(0_50%_0_0)]">
        <span className="hero-ring-half absolute inset-0 [clip-path:inset(0_0_0_50%)]" style={timing(half)} onAnimationEnd={onSecondEnd}>
          {HALF_RING}
        </span>
      </span>
    </span>
  );
}
