"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { Home, FileText, Map, Compass, Globe, Info, MessageCircle, Heart, Phone, ShieldCheck, Loader2, MapPin, ArrowRight } from 'lucide-react';
import { slugify } from '@/lib/admin-helpers';

// 🗺️ КАРТА НА СНИМКИТЕ ЗА КОНТИНЕНТИТЕ
const continentImageMap: Record<string, string> = {
    'азия': '/assets/continents/asia_tr.png',
    'европа': '/assets/continents/europe_tr.png',
    'африка': '/assets/continents/africa_tr.png',
    'северна америка': '/assets/continents/north_america_tr.png',
    'южна америка': '/assets/continents/south_america_tr.png',
    'австралия': '/assets/continents/australia_tr.png',
    'австралия и океания': '/assets/continents/australia_tr.png',
    'default': '/assets/continents/europe_tr.png' 
};

export default function SitemapPage() {
  const [tours, setTours] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const qTours = query(collection(db, "tours"), where("status", "==", "public"));
        const toursSnap = await getDocs(qTours);
        setTours(toursSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const qPosts = query(collection(db, "posts"));
        const postsSnap = await getDocs(qPosts);
        setPosts(postsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching sitemap data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 🔄 ГРУПИРАНЕ: Разделяме държавите, за да излизат поотделно
  const groupedTours = tours.reduce((acc: any, tour) => {
    const cont = tour.continent ? tour.continent.trim() : 'Други';
    
    // Разделяме държавите, ако са изписани със запетая
    let countries: string[] = [];
    if (Array.isArray(tour.country)) {
      countries = tour.country;
    } else if (typeof tour.country === 'string') {
      countries = tour.country.split(',').map((c : any) => c.trim());
    } else {
      countries = ['Разни'];
    }

    if (!acc[cont]) acc[cont] = {}; 

    // Добавяме тура към всяка държава, която съдържа
    countries.forEach(country => {
      if (!acc[cont][country]) acc[cont][country] = []; 
      acc[cont][country].push(tour);
    });

    return acc;
  }, {});

  // 🎨 Функция за стилове
  const getContinentStyle = (continent: string) => {
      const lower = continent.toLowerCase();
      const imgPath = continentImageMap[lower] || continentImageMap['default'];
      
      // Цветови теми
      let theme = { bg: 'bg-gray-50', border: 'border-gray-100', text: 'text-gray-700', light: 'bg-gray-100' };
      if (lower.includes('азия')) theme = { bg: 'bg-rose-50/80', border: 'border-rose-200', text: 'text-rose-800', light: 'bg-rose-100' };
      else if (lower.includes('европа')) theme = { bg: 'bg-blue-50/80', border: 'border-blue-200', text: 'text-blue-800', light: 'bg-blue-100' };
      else if (lower.includes('африка')) theme = { bg: 'bg-amber-50/80', border: 'border-amber-200', text: 'text-amber-800', light: 'bg-amber-100' };
      else if (lower.includes('северна америка')) theme = { bg: 'bg-cyan-50/80', border: 'border-cyan-200', text: 'text-cyan-800', light: 'bg-cyan-100' };
      else if (lower.includes('южна америка')) theme = { bg: 'bg-emerald-50/80', border: 'border-emerald-200', text: 'text-emerald-800', light: 'bg-emerald-100' };
      else if (lower.includes('австралия')) theme = { bg: 'bg-purple-50/80', border: 'border-purple-200', text: 'text-purple-800', light: 'bg-purple-100' };
      
      return { theme, imgPath };
  };

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "TableOfContents",
    "name": "Карта на сайта Beliva VIP Tour",
    "description": "Списък с всички екскурзии, блог статии и информационни страници.",
    "url": "https://belivavip.bg/sitemaps"
  };

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fcf9f2]">
            <Loader2 className="animate-spin text-brand-gold" size={40} />
        </div>
    );
  }

  return (
    <main className="min-h-screen relative pt-32 pb-20 overflow-hidden">
      <title>Карта на сайта | Beliva VIP Tour</title>
      <meta name="description" content="Пълен списък с всички страници и екскурзии на Beliva VIP Tour." />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />

      {/* 🖼️ ФОНОВ СЛОЙ */}
      <div className="absolute inset-0 z-0">
         {/* Сложи тук хубава снимка, например world map или landscape */}
         <Image 
            src="/hero/thailand.webp" 
            alt="Background" 
            fill 
            className="object-cover opacity-10 blur-sm" 
            priority
         />
         <div className="absolute inset-0 bg-gradient-to-b from-[#fcf9f2]/90 via-[#fcf9f2]/80 to-[#fcf9f2]" />
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        
        {/* HEADER */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-lg text-brand-gold mb-6 animate-in zoom-in duration-500">
                <Compass size={40} strokeWidth={1.5} />
            </div>
            <h1 className="text-5xl md:text-6xl font-serif italic text-brand-dark mb-6 drop-shadow-sm">
                Карта на <span className="text-brand-gold">Света</span>
            </h1>
            <p className="text-gray-600 text-lg md:text-xl font-light leading-relaxed">
                Навигирайте лесно през нашите предложения. Изберете континент, държава или разгледайте нашия пътеводител.
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* ЛЯВА КОЛОНА: Меню и Блог (4 колони) */}
            <div className="lg:col-span-4 space-y-8 sticky top-28">
                
                {/* Основни страници */}
                <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] shadow-lg border border-brand-gold/20 hover:shadow-xl transition-all">
                    <h2 className="flex items-center gap-3 text-xl font-bold text-brand-dark mb-6 border-b border-gray-100 pb-4">
                        <div className="p-2.5 bg-brand-dark text-white rounded-xl shadow-md"><Home size={18}/></div>
                        Основни Връзки
                    </h2>
                    <ul className="space-y-3">
                        {[
                            { href: '/', label: 'Начало', icon: Globe },
                            { href: '/about-us', label: 'За Нас', icon: Info },
                            { href: '/reviews', label: 'Отзиви', icon: MessageCircle },
                            { href: '/contacts', label: 'Контакти', icon: Phone },
                            { href: '/faq', label: 'Въпроси', icon: ShieldCheck },
                        ].map((link, idx) => (
                            <li key={idx}>
                                <Link href={link.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-brand-gold/10 text-gray-600 hover:text-brand-dark transition-all group font-medium">
                                    <link.icon size={18} className="text-brand-gold group-hover:scale-110 transition-transform"/> 
                                    {link.label}
                                    <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-brand-gold" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-2 text-xs">
                        <Link href="/privacy" className="text-gray-400 hover:text-brand-gold">Политика за поверителност</Link>
                        <span className="text-gray-300">•</span>
                        <Link href="/terms" className="text-gray-400 hover:text-brand-gold">Общи условия</Link>
                    </div>
                </div>

                {/* Блог */}
                <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] shadow-lg border border-brand-gold/20 hover:shadow-xl transition-all relative overflow-hidden group">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-100/50 rounded-full blur-3xl group-hover:bg-orange-200/50 transition-colors"></div>
                    <h2 className="flex items-center gap-3 text-xl font-bold text-brand-dark mb-6 relative z-10">
                        <div className="p-2.5 bg-orange-500 text-white rounded-xl shadow-md"><FileText size={18}/></div>
                        Пътеводител
                    </h2>
                    <ul className="space-y-4 relative z-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {posts.map(post => (
                            <li key={post.id}>
                                <Link href={`/blog/${post.slug || post.id}`} className="block group/link">
                                    <span className="text-sm font-bold text-gray-700 group-hover/link:text-brand-gold transition-colors line-clamp-2 leading-tight">
                                        {post.title}
                                    </span>
                                    <span className="text-[10px] text-gray-400 mt-1 block">Прочети статията &rarr;</span>
                                </Link>
                            </li>
                        ))}
                        {posts.length === 0 && <li className="text-gray-400 italic text-sm">Очаквайте скоро интересни истории...</li>}
                    </ul>
                </div>
            </div>

            {/* ДЯСНА КОЛОНА: Екскурзии (8 колони) */}
            <div className="lg:col-span-8 space-y-10">
                
                {/* Заглавие на секцията */}
                <div className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl border border-white shadow-sm flex items-center justify-between">
                    <h2 className="flex items-center gap-3 text-2xl font-bold text-brand-dark">
                        <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-md"><Map size={24}/></div>
                        Дестинации по Света
                    </h2>
                    <span className="text-sm font-bold bg-brand-gold text-white px-3 py-1 rounded-full">{tours.length} Оферти</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Сортираме континентите по азбучен ред */}
                    {Object.keys(groupedTours).sort().map(continent => {
                        const style = getContinentStyle(continent);
                        const countries = groupedTours[continent];

                        return (
                            <div key={continent} className={`rounded-[2.5rem] border overflow-hidden transition-all hover:shadow-2xl group ${style.theme.bg} ${style.theme.border}`}>
                                
                                {/* Header на Континента */}
                                <div className="p-6 pb-0 flex items-center justify-between relative">
                                    {/* СЛЕД (Добавяме Link със slugify): */}
                                    <Link href={`/?continent=${slugify(continent)}#tours-grid`} className="group/cont">
                                      <h3 className={`text-2xl font-black uppercase tracking-wide transition-colors group-hover/cont:text-brand-gold ${style.theme.text}`}>
                                          {continent}
                                      </h3>
                                    </Link>
                                    <div className="w-20 h-20 relative -mr-4 -mt-2 opacity-80 group-hover:scale-110 transition-transform duration-500">
                                        <Image 
                                            src={style.imgPath} 
                                            alt={continent}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Списък с държави */}
                                    {Object.keys(countries).sort().map(country => (
                                        <div key={country} className="bg-white/60 rounded-2xl p-4 border border-white/50 shadow-sm hover:bg-white transition-colors">
                                            
                                            {/* 👇 ИНТЕРАКТИВНА ДЪРЖАВА: Клик води към филтъра */}
                                            <Link 
                                                href={`/destinations/${slugify(country)}`}
                                                className="flex items-center gap-2 mb-3 group/country cursor-pointer w-fit"
                                                title={`Виж всички оферти за ${country}`}
                                            >
                                                <div className={`p-1.5 rounded-lg ${style.theme.light} ${style.theme.text}`}>
                                                    <MapPin size={14} />
                                                </div>
                                                <span className="font-bold text-lg text-gray-800 border-b-2 border-transparent group-hover/country:border-brand-gold group-hover/country:text-brand-gold transition-all">
                                                    {country}
                                                </span>
                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold ml-2 group-hover/country:bg-brand-gold group-hover/country:text-white transition-colors">
                                                    {countries[country].length}
                                                </span>
                                            </Link>

                                            {/* Списък с конкретните турове под държавата */}
                                            <ul className="space-y-2 pl-2 border-l-2 border-gray-100 ml-3">
                                                {countries[country].map((tour: any) => (
                                                    <li key={tour.id}>
                                                        <Link href={`/tour/${tour.slug || tour.tourId || tour.id}`} className="block text-sm text-gray-600 hover:text-brand-dark hover:translate-x-1 transition-all py-0.5">
                                                            {tour.title}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {Object.keys(groupedTours).length === 0 && (
                    <div className="text-center text-gray-400 py-20 bg-white rounded-[2.5rem] border-dashed border-2 border-gray-200">
                        Все още няма качени екскурзии в системата.
                    </div>
                )}
            </div>

        </div>
      </div>
    </main>
  );
}