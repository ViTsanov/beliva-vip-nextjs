import { useEffect, useRef } from 'react';

// Бутонът Назад (хардуерният на телефона или на браузъра) трябва да ЗАТВАРЯ отворен модал/снимка,
// а не да връща предишната страница.
//
// Как работи:
//  - Когато модалът се отвори, добавяме един "фалшив" запис в историята на браузъра (същият URL).
//  - Назад маха този запис → браузърът изпраща popstate → затваряме модала и оставаме на страницата.
//  - Ако модалът се затвори по друг начин (бутон X, клик извън него, успешно изпращане), сами махаме
//    записа с history.back(), за да не остава "празно" Назад.
//  - Няколко отворени модала един върху друг се пазят в стек: едно Назад затваря САМО най-горния.
//  - Копираме съществуващия history.state, защото Next.js App Router пази свои данни в него
//    (без тях при Назад би презаредил цялата страница).
//  - history.back() викаме само ако текущият запис още е наш — ако междувременно е станала навигация
//    към друга страница (напр. компонентът се размонтира при смяна на маршрута), историята не се пипа.

interface ModalEntry {
  id: number;
  close: () => void;
}

const modalStack: ModalEntry[] = [];
let nextModalId = 1;
// Колко popstate събития да пропуснем, защото са предизвикани от НАШЕ history.back()
let ignorePops = 0;
let listening = false;

const STATE_KEY = '__belivaModal';

function handlePopState() {
  if (ignorePops > 0) {
    ignorePops--;
    return;
  }
  const top = modalStack.pop();
  if (top) top.close();
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
      listening = true;
    }

    const id = nextModalId++;
    modalStack.push({ id, close: () => onCloseRef.current() });
    window.history.pushState({ ...(window.history.state || {}), [STATE_KEY]: id }, '');

    return () => {
      const index = modalStack.findIndex(entry => entry.id === id);
      // index === -1 → записът вече е махнат от самия браузър (потребителят натисна Назад)
      if (index === -1) return;
      modalStack.splice(index, 1);
      if (typeof window.history.state?.[STATE_KEY] === 'number') {
        ignorePops++;
        window.history.back();
      }
    };
  }, [isOpen, mobileOnly]);
}
