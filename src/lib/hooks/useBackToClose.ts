import { useEffect, useRef } from 'react';

// Бутонът Назад (хардуерният на телефона или на браузъра) трябва да ЗАТВАРЯ отворен модал/меню/снимка,
// а не да връща предишната страница.
//
// Как работи:
//  - Всеки отворен модал се записва в стек. За всеки модал в стека в историята на браузъра има по един
//    "фалшив" запис (същият URL) с номер на дълбочината му (1, 2, …) в history.state.
//  - Назад маха един запис → popstate с по-малка дълбочина → затваряме най-горния модал и оставаме на страницата.
//  - Ако модалът се затвори по друг начин (X, клик извън него, успешно изпращане), сами махаме записа с
//    history.go(-1), за да не остава "празно" Назад.
//  - Записът се добавя веднага при отваряне, но се маха малко след затваряне (sync в setTimeout). Така в
//    StrictMode (dev) двойното монтиране (отвори → затвори → отвори) остава един запис, а смяната на един
//    модал с друг (меню → запитване) не мърда историята изобщо.
//  - Ако модалът се затваря, защото потребителят отива на друга страница (линк в менюто/търсачката), записът
//    се оставя — history.go(-1) би отменил навигацията. Когато по-късно Назад стигне до такъв "осиротял" запис,
//    той се прескача автоматично, така че едно Назад пак води до предишната страница.
//  - Копираме съществуващия history.state, защото Next.js App Router пази свои данни в него
//    (без тях при Назад би презаредил цялата страница).

interface ModalEntry {
  id: number;
  close: () => void;
}

const STATE_KEY = '__belivaModal';

const modalStack: ModalEntry[] = [];
let nextModalId = 1;
// Колко от модалите в стека вече имат свой запис в историята
let pushedDepth = 0;
// Чакаме popstate от НАШЕ history.go(), преди да пипаме историята отново
let pendingTraversal = false;
let syncScheduled = false;
let navigationMarkedAt = 0;
let listening = false;

function stateDepth(state: unknown): number {
  const depth = (state as Record<string, unknown> | null)?.[STATE_KEY];
  return typeof depth === 'number' ? depth : 0;
}

/**
 * Да се извика точно преди програмна навигация (router.push) от отворен модал — така затварянето му
 * няма да връща историята назад и да отменя навигацията. Кликовете по <a>/<Link> се хващат сами.
 */
export function markModalNavigation() {
  navigationMarkedAt = Date.now();
}

/** Дали модалът се затваря, защото потребителят отива на друга страница (линк в него) — тогава не връщаме скрола. */
export function isModalNavigationPending() {
  return Date.now() - navigationMarkedAt < 2000;
}

function scheduleSync() {
  if (syncScheduled) return;
  syncScheduled = true;
  setTimeout(sync, 0);
}

function sync() {
  syncScheduled = false;
  if (pendingTraversal) return; // sync се вика отново, щом дойде popstate-ът

  const want = modalStack.length;
  if (want > pushedDepth) {
    for (let depth = pushedDepth + 1; depth <= want; depth++) {
      window.history.pushState({ ...(window.history.state || {}), [STATE_KEY]: depth }, '');
    }
    pushedDepth = want;
    return;
  }

  if (want < pushedDepth) {
    const currentDepth = stateDepth(window.history.state);
    const navigating = Date.now() - navigationMarkedAt < 2000;
    pushedDepth = want;
    // Навигация към друга страница или Next.js е заменил записа (router.replace) — оставяме историята
    if (navigating || currentDepth <= want) return;
    pendingTraversal = true;
    window.history.go(want - currentDepth);
  }
}

function handlePopState(event: PopStateEvent) {
  if (pendingTraversal) {
    pendingTraversal = false;
    scheduleSync();
    return;
  }

  const depth = stateDepth(event.state);
  if (depth < pushedDepth) {
    // Назад: затваряме модалите над новата дълбочина, от най-горния надолу (обикновено е само един)
    const closing = modalStack.splice(depth).reverse();
    pushedDepth = depth;
    closing.forEach(entry => entry.close());
  } else if (depth > pushedDepth) {
    // Осиротял запис на вече затворен модал (Напред или Назад след навигация от модал) — прескачаме го
    pendingTraversal = true;
    window.history.go(pushedDepth - depth);
  }
}

// Клик по линк към друг адрес → затварянето на модала е част от навигация, историята не се връща
function handleLinkClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return;
  if (url.href !== window.location.href) markModalNavigation();
}

interface Options {
  /** Само на екрани под 768px (md) — за плаващи прозорци, които на десктоп не се възприемат като "екран". */
  mobileOnly?: boolean;
}

export function useBackToClose(isOpen: boolean, onClose: () => void, options: Options = {}) {
  const { mobileOnly = false } = options;

  // Пазим най-новия onClose в ref, за да не пре-създаваме запис в историята при всеки render
  // (родителите често подават нова стрелка () => setX(false) при всеки render).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    if (mobileOnly && !window.matchMedia('(max-width: 767px)').matches) return;

    if (!listening) {
      window.addEventListener('popstate', handlePopState);
      document.addEventListener('click', handleLinkClick, true);
      listening = true;
    }

    const id = nextModalId++;
    modalStack.push({ id, close: () => onCloseRef.current() });
    // Записът се добавя веднага — преди заключването на скрола (то е в по-късен ефект), иначе браузърът
    // запомня позиция 0 за страницата и при Назад я връща най-горе. Махането остава отложено (StrictMode).
    sync();

    return () => {
      const index = modalStack.findIndex(entry => entry.id === id);
      // index === -1 → записът вече е махнат от самия браузър (потребителят натисна Назад)
      if (index === -1) return;
      modalStack.splice(index, 1);
      scheduleSync();
    };
  }, [isOpen, mobileOnly]);
}
