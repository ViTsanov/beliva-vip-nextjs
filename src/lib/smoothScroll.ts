// Плавно превъртане на страницата при натискане на бутон („нагоре“, „Разгледай екскурзиите“, филтър от глобуса).
//
// Защо не window.scrollTo({ behavior: 'smooth' }):
//  - при намалено движение (включено при собственика и на много iPhone-и) там ползвахме скок без анимация и
//    ефектът изглеждаше „изчезнал“. Тук то е по-кратко и меко, но остава превъртане — потребителят сам го е поискал;
//  - собствената анимация е еднаква във всички браузъри (Safari и Chrome имат различна скорост и крива).
// Докосване или колелце по време на анимацията я спира — не се бори с пръста на потребителя.

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let cancelCurrent: (() => void) | null = null;

export function glideTo(targetY: number, { duration = 800, onDone }: { duration?: number; onDone?: () => void } = {}) {
  cancelCurrent?.();

  const reduce = reducedMotion();
  const ms = reduce ? Math.min(duration, 500) : duration;
  // Ease-out (тръгва веднага, плавно спира); при намалено движение — синусоида, без рязкото начално ускорение
  const ease = reduce
    ? (t: number) => -(Math.cos(Math.PI * t) - 1) / 2
    : (t: number) => 1 - Math.pow(1 - t, 3);

  const maxY = document.documentElement.scrollHeight - window.innerHeight;
  const endY = Math.max(0, Math.min(targetY, maxY));
  const startY = window.scrollY;
  const distance = endY - startY;
  let startTime: number | null = null;
  let frame = 0;

  const finish = () => {
    window.removeEventListener('touchstart', stop);
    window.removeEventListener('wheel', stop);
    cancelCurrent = null;
    onDone?.();
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    finish();
  };
  window.addEventListener('touchstart', stop, { passive: true, once: true });
  window.addEventListener('wheel', stop, { passive: true, once: true });
  cancelCurrent = stop;

  const step = (now: number) => {
    if (startTime === null) startTime = now;
    const t = Math.min((now - startTime) / ms, 1);
    // behavior 'instant' на всяка стъпка: глобалното scroll-behavior: smooth (globals.css) иначе превръща всяка
    // стъпка в отделна малка анимация — на iPhone те изостават и после наваксват наведнъж.
    window.scrollTo({ top: startY + distance * ease(t), behavior: 'instant' });
    if (t < 1) frame = requestAnimationFrame(step);
    else finish();
  };
  frame = requestAnimationFrame(step);
}

// Превърта до елемент, като зачита неговия scroll-margin-top (отстъпа за фиксираното меню), както scrollIntoView.
export function glideToElement(el: Element | null, opts?: { duration?: number; offset?: number; onDone?: () => void }) {
  if (!el) return;
  const margin = opts?.offset ?? (parseFloat(getComputedStyle(el).scrollMarginTop) || 0);
  glideTo(el.getBoundingClientRect().top + window.scrollY - margin, opts);
}
