"use client";

// Отложено зареждане на тежки клиентски компоненти, които не са нужни за първото изрисуване на страницата.
// next/dynamic с ssr:false изтегля техния код (react-markdown, Firestore слушател и т.н.) едва когато се монтират.
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const AIChatWidget = dynamic(() => import('@/components/AIChatWidget'), { ssr: false });
const Testimonials = dynamic(() => import('@/components/Testimonials'), { ssr: false });

// Чат бутонът се появява, когато браузърът е свободен (или най-късно след 4s) — не се състезава с hero снимката и скриптовете.
export function LazyAIChatWidget() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 4000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setReady(true), 3000);
    return () => clearTimeout(t);
  }, []);
  return ready ? <AIChatWidget /> : null;
}

// Ревютата се зареждат, когато потребителят се доближи до тях (600px преди да влязат във viewport). Резервираната
// височина пази страницата от „скок“ при зареждане.
export function LazyTestimonials() {
  const holderRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = holderRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      const t = setTimeout(() => setVisible(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  if (visible) return <Testimonials />;
  return <div ref={holderRef} className="min-h-[560px] w-full bg-gray-50" aria-hidden="true" />;
}
