"use client";

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface StatItem {
  prefix?: string;
  value: string;
  label: string;
  delay: number;
}

const STATS: StatItem[] = [
  { prefix: 'Над', value: '60', label: 'Дестинации', delay: 0 },
  { prefix: 'Над', value: '150', label: 'Водени групи', delay: 0.1 },
  { value: '15+', label: 'Години опит', delay: 0.2 },
  { value: '★ 4.9', label: 'Средна оценка', delay: 0.3 },
];

function Stat({ prefix, value, label, delay }: StatItem) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="flex flex-col items-center justify-center py-8 px-4"
    >
      <div className="flex items-baseline gap-1.5 mb-1.5">
        {prefix && (
          <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">
            {prefix}
          </span>
        )}
        <span className="text-4xl md:text-5xl font-serif font-bold text-brand-gold leading-none tabular-nums">
          {value}
        </span>
      </div>
      <span className="text-gray-500 text-[9px] font-black uppercase tracking-[0.3em] text-center">
        {label}
      </span>
    </motion.div>
  );
}

export default function StatsBar() {
  return (
    <section className="bg-white border-y border-brand-gold/15">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-brand-gold/10 divide-y md:divide-y-0">
          {STATS.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}
