import { useEffect, useState } from 'react';

// true след първото действие на посетителя — скрол, докосване, клик или клавиш (или след fallbackMs, ако е
// зададено). Точно при тези действия Google спира да мери „кога се зареди главното съдържание“ (LCP).
// Слайдшоуто в героса чака това, преди първата автоматична смяна: иначе новото име (по-късата дума е с по-големи
// букви) излизаше на 8-ата секунда като „по-голямо съдържание“ и Google броеше страницата за заредена чак тогава.
// Без резервно време по подразбиране: Lighthouse мери тази страница ~30 s (отворената връзка към Firestore), така че
// и смяна след 20 s пак се броеше.
const EVENTS = ['scroll', 'wheel', 'pointerdown', 'touchstart', 'keydown'] as const;

export function useVisitorEngaged(fallbackMs?: number) {
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    if (engaged) return;
    const done = () => setEngaged(true);
    EVENTS.forEach(e => window.addEventListener(e, done, { passive: true, once: true }));
    const t = fallbackMs ? setTimeout(done, fallbackMs) : undefined;
    return () => {
      EVENTS.forEach(e => window.removeEventListener(e, done));
      if (t) clearTimeout(t);
    };
  }, [engaged, fallbackMs]);

  return engaged;
}
