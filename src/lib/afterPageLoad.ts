// Извиква cb, когато страницата е заредена докрай (събитието load) и браузърът е свободен, но не по-рано от
// minDelay ms след извикването. За неща „за после“ (предварително зареждане на следващите снимки в героса),
// които иначе се бутат за мрежата и процесора с първия екран на бавен телефон. Връща функция за отказ.
export function afterPageLoad(cb: () => void, minDelay = 0): () => void {
  const start = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let idle: number | undefined;
  let cancelled = false;

  const run = () => {
    if (cancelled) return;
    timer = setTimeout(() => {
      if (cancelled) return;
      if ('requestIdleCallback' in window) idle = window.requestIdleCallback(() => !cancelled && cb(), { timeout: 2000 });
      else cb();
    }, Math.max(0, minDelay - (Date.now() - start)));
  };

  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });

  return () => {
    cancelled = true;
    window.removeEventListener('load', run);
    if (timer) clearTimeout(timer);
    if (idle !== undefined && 'cancelIdleCallback' in window) window.cancelIdleCallback(idle);
  };
}
