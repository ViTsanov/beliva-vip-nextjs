"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import Link from 'next/link'; // 👈 Next Link
import { Calendar, ArrowRight, Clock } from 'lucide-react';

export default function BlogListPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Данни за Google (Schema)
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Beliva VIP Travel Blog",
    "description": "Полезни съвети, пътеводители и истории от света на луксозните пътувания.",
    "url": "https://belivavip.bg/blog",
    "publisher": {
      "@type": "Organization",
      "name": "Beliva VIP Tour",
      "logo": {
        "@type": "ImageObject",
        "url": "https://belivavip.bg/beliva_logo.png"
      }
    }
  };

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  if (loading) {
      return <div className="min-h-screen bg-[#fcf9f2] pt-32 text-center text-brand-dark font-serif italic">Зареждане на дневника...</div>;
  }

  return (
    <div className="min-h-screen bg-[#fcf9f2] flex flex-col">
      
      {/* Ръчно SEO */}
      <title>Блог и Пътеводител | Beliva VIP Tour</title>
      <meta name="description" content="Полезни съвети и истории от света на пътешествията." />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />

      <main className="flex-grow pt-32 pb-20 container mx-auto px-6">
        
        <div className="text-center mb-16">
          <span className="text-brand-gold text-xs font-black uppercase tracking-[0.2em] block mb-2">Нашият Блог</span>
          <h1 className="text-4xl md:text-6xl font-serif italic text-brand-dark mb-6">Дневник на пътешественика</h1>
          <div className="h-[1px] w-24 bg-brand-gold mx-auto"></div>
        </div>

        {posts.length > 0 && (
            <>
                {/* 1. FEATURED POST */}
                {featuredPost && (
                    <Link 
                        href={`/blog/${featuredPost.slug || featuredPost.id}`} 
                        className="group block mb-20 relative rounded-[3rem] overflow-hidden shadow-2xl"
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
                            {/* Снимка */}
                            <div className="relative h-[400px] lg:h-[500px] overflow-hidden">
                                <img 
                                    src={featuredPost.coverImg} 
                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                                    alt={featuredPost.title} 
                                />
                                <div className="absolute top-6 left-6 bg-brand-gold text-brand-dark px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
                                    Най-ново
                                </div>
                            </div>
                            
                            {/* Текст */}
                            <div className="bg-brand-dark text-white p-10 lg:p-16 flex flex-col justify-center">
                                <div className="flex items-center gap-2 text-brand-gold text-xs font-bold uppercase mb-4 opacity-80">
                                    <Calendar size={14}/> 
                                    {featuredPost.createdAt?.seconds ? new Date(featuredPost.createdAt.seconds * 1000).toLocaleDateString('bg-BG') : 'Скоро'}
                                </div>
                                <h2 className="text-3xl lg:text-5xl font-serif italic mb-6 leading-tight group-hover:text-brand-gold transition-colors">
                                    {featuredPost.title}
                                </h2>
                                <p className="text-gray-400 text-lg leading-relaxed mb-8 line-clamp-3">
                                    {featuredPost.excerpt}
                                </p>
                                <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-white group-hover:gap-5 transition-all">
                                    Прочети историята <ArrowRight className="text-brand-gold"/>
                                </div>
                            </div>
                        </div>
                    </Link>
                )}

                {/* 2. MASONRY GRID */}
                <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
                    {otherPosts.map(post => (
                        <Link 
                            href={`/blog/${post.slug || post.id}`} 
                            key={post.id} 
                            className="group block break-inside-avoid mb-8"
                        >
                            <div className="bg-white rounded-[2rem] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 border border-brand-gold/5">
                                <div className="relative overflow-hidden">
                                    <img 
                                        src={post.coverImg} 
                                        className="w-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                        alt={post.title} 
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                </div>

                                <div className="p-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400">
                                            <Clock size={12} className="text-brand-gold"/>
                                            {post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleDateString('bg-BG') : 'Скоро'}
                                        </div>
                                    </div>

                                    <h3 className="text-2xl font-serif font-bold text-brand-dark mb-4 group-hover:text-brand-gold transition-colors leading-tight">
                                        {post.title}
                                    </h3>

                                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 mb-6">
                                        {post.excerpt}
                                    </p>

                                    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-dark border-b border-brand-gold/30 pb-1 group-hover:border-brand-gold transition-all">
                                        Виж повече
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </>
        )}

        {posts.length === 0 && (
            <div className="text-center py-20 text-gray-400">Все още няма публикации. Очаквайте скоро!</div>
        )}
      </main>
    </div>
  );
}