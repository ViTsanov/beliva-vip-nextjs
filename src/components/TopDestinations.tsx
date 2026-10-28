"use client";

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MapPin, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { startNavigationProgress } from '@/components/NavigationProgress';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { slugify } from '@/lib/admin-helpers';
import Image from 'next/image';
import { useRevealOnce, revealVars } from '@/components/ui/Reveal';

interface Destination {
  name: string;
  image: string;
}

interface TopDestinationsProps {
  // Server-prefetched data (optional — component falls back to client fetch if empty)
  initialDestinations?: Destination[];
  counts?: Record<string, number>;
}

export default function TopDestinations({ initialDestinations = [], counts: initialCounts = {} }: TopDestinationsProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations);
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [loading, setLoading] = useState(initialDestinations.length === 0);
  // Появяване с чист CSS (.reveal), а не с framer-motion whileInView — framer в края на анимацията записва
  // крайната прозрачност отделно и картите за миг „примигваха“.
  const [rowRef, rowVisible] = useRevealOnce<HTMLDivElement>();
  // След като последната карта се появи, махаме анимацията изцяло (крайното ѝ състояние = нормалното, затова нищо
  // не се променя на екрана). Иначе картата остава отделен слой и в Chrome снимките изглеждат по-меки.
  const [settled, setSettled] = useState(false);

  // Client-side fallback: only fires if server didn't supply data
  useEffect(() => {
    if (initialDestinations.length > 0) return; // Server data is good, skip

    const fetchData = async () => {
      setLoading(true);
      try {
        const configSnap = await getDoc(doc(db, "settings", "homepage"));
        if (configSnap.exists() && configSnap.data().topDestinations) {
          setDestinations(configSnap.data().topDestinations);
        }

        const q = query(collection(db, "tours"), where("status", "==", "public"));
        const tourSnap = await getDocs(q);
        const newCounts: Record<string, number> = {};
        tourSnap.docs.forEach(d => {
          const data = d.data();
          if (data.country) {
            const countries = typeof data.country === 'string'
              ? data.country.split(',').map((c: string) => c.trim())
              : (Array.isArray(data.country) ? data.country : [data.country]);
            countries.forEach((c: string) => {
              if (c) newCounts[c] = (newCounts[c] || 0) + 1;
            });
          }
        });
        setCounts(newCounts);
      } catch (error) {
        console.error("Грешка при зареждане на топ дестинации:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [initialDestinations.length]);

  const handleSelect = (country: string) => {
    startNavigationProgress('/');
    router.push(`/?country=${slugify(country)}#tours-grid`, { scroll: false });
    setTimeout(() => {
      const grid = document.getElementById('tours-grid');
      if (grid) {
        const y = grid.getBoundingClientRect().top + window.scrollY - 150;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { current } = scrollContainerRef;
      const scrollAmount = 320;
      const maxScroll = current.scrollWidth - current.clientWidth;
      const currentScroll = current.scrollLeft;
      if (direction === 'right') {
        current.scrollTo({ left: currentScroll >= maxScroll - 10 ? 0 : currentScroll + scrollAmount, behavior: 'smooth' });
      } else {
        current.scrollTo({ left: currentScroll <= 10 ? maxScroll : currentScroll - scrollAmount, behavior: 'smooth' });
      }
    }
  };

  // Skeleton while client-side fallback is loading
  if (loading) {
    return (
      <section id="top-destinations" className="py-16 bg-white relative z-20 scroll-mt-28 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="mb-10">
            <div className="h-3 w-24 bg-brand-gold/20 rounded-full mb-3" />
            <div className="h-10 w-64 bg-gray-100 rounded-2xl" />
          </div>
          <div className="flex gap-6 overflow-hidden">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="min-w-[280px] md:min-w-[300px] h-[400px] rounded-[2rem] bg-gray-100 flex-shrink-0" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!destinations || destinations.length === 0) return null;

  return (
    <section id="top-destinations" className="py-16 bg-white relative z-20 scroll-mt-28 overflow-hidden">
      <div className="container mx-auto px-6">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <span className="text-brand-gold text-xs font-black uppercase tracking-[0.25em] block mb-2">Вдъхновение</span>
            <h2 className="text-4xl md:text-5xl font-serif italic text-brand-dark">Топ Дестинации</h2>
          </div>
          <div className="hidden md:flex gap-2">
            <button onClick={() => scroll('left')} className="p-3 rounded-full border border-gray-200 hover:bg-brand-dark hover:text-white hover:border-brand-dark transition-all" aria-label="Предишна дестинация">
              <ChevronLeft size={24} />
            </button>
            <button onClick={() => scroll('right')} className="p-3 rounded-full border border-gray-200 hover:bg-brand-dark hover:text-white hover:border-brand-dark transition-all" aria-label="Следваща дестинация">
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        <div
          ref={(el) => { scrollContainerRef.current = el; rowRef.current = el; }}
          className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scroll-smooth -mx-6 px-6 md:mx-0 md:px-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {destinations.map((dest, index) => {
            const count = counts[dest.name] || 0;
            return (
              <div
                key={dest.name}
                onClick={() => handleSelect(dest.name)}
                style={settled ? undefined : revealVars({ y: 0, duration: 0.4, delay: index * 0.08 })}
                onAnimationEnd={(e) => {
                  if (e.target === e.currentTarget && index === destinations.length - 1) setSettled(true);
                }}
                className={`${settled ? '' : `reveal ${rowVisible ? 'revealed' : ''}`} min-w-[280px] md:min-w-[300px] h-[400px] relative group rounded-[2rem] overflow-hidden cursor-pointer snap-center md:snap-start border border-gray-100`}
              >
                <div className="absolute inset-0">
                  <Image
                    src={dest.image}
                    alt={`Екскурзия и почивка в ${dest.name} - топ оферти от Beliva VIP Tour`}
                    fill
                    // Картата е 300×400 (изправена), а снимките са хоризонтални — за да покрие височината, снимката
                    // се рисува ~600px широка. С „300px“ браузърът сваляше двойно по-малка снимка и я разтягаше.
                    sizes="600px"
                    // Без priority: лентата е най-долу на страницата на тура и снимките ѝ се бутаха за мрежата с главната
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="absolute bottom-0 left-0 w-full p-6 text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                  <div className="flex items-center gap-2 mb-2 text-brand-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-y-2 group-hover:translate-y-0">
                    <MapPin size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Разгледай</span>
                  </div>
                  <h3 className="text-3xl font-serif font-bold italic mb-1">{dest.name}</h3>
                  <div className="flex items-center justify-between border-t border-white/20 pt-3 mt-2">
                    <span className="text-xs font-medium text-gray-300">
                      {count > 0 ? `${count} ${count === 1 ? 'оферта' : 'оферти'}` : 'Очаквайте скоро'}
                    </span>
                    {/* „Матово стъкло“ с полупрозрачен фон и светъл кант, без backdrop-blur — размазването се
                        преизчертава в края на появяването и мига */}
                    <div className="w-8 h-8 rounded-full bg-white/20 ring-1 ring-inset ring-white/35 shadow-sm flex items-center justify-center group-hover:bg-brand-gold group-hover:text-brand-dark group-hover:ring-transparent transition-colors">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
