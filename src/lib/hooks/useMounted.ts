"use client";

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Връща `false` по време на SSR И при първия рендър на клиента (при хидратация), после автоматично
 * става `true` веднага след реалното монтиране — БЕЗ да вика setState вътре в useEffect тяло.
 *
 * Защо не просто useState(false) + useEffect(() => setMounted(true))? Защото react-hooks/set-state-in-effect
 * (по-новото, по-строго ESLint правило) го маркира като anti-pattern — synchronous setState в ефект
 * причинява допълнителен render pass. useSyncExternalStore е официално препоръчаният от React екипа начин
 * за точно този случай ("дай ми различна стойност на сървъра срещу клиента, без каскадни render-и").
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,   // клиентски snapshot — вече сме монтирани
    () => false,  // сървърен snapshot — по време на SSR винаги false
  );
}
