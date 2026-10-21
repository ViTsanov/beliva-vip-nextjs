import type { Metadata } from 'next';
import { shareMetadata } from '@/lib/shareMeta';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import BlogListClient from './BlogListClient';
import { Suspense } from 'react';
import JsonLd from '@/components/JsonLd';
import { getActiveTours } from '@/services/tourService';
import { fetchAllMedia, findCountryHeroImage } from '@/lib/media-helpers';
import { isOperatorHotlink } from '@/lib/operatorImageDomains';
import { slugify } from '@/lib/admin-helpers';

export const revalidate = 1800; // refresh every 30 min

export const metadata: Metadata = {
  title: { absolute: 'Пътеводител и Блог | Beliva VIP Tour' },
  description: 'Пътеводители, съвети и истории от пътешествия до Япония, Австралия, Тайланд, Перу и още 60+ дестинации. Четете преди да тръгнете.',
  alternates: { canonical: 'https://belivavip.bg/blog' },
  ...shareMetadata({
    path: '/blog',
    title: 'Пътеводител и Блог | Beliva VIP Tour',
    description: 'Статии и пътеводители за над 60 дестинации.',
  }),
};

const schemaData = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'Beliva VIP Travel Blog',
  description: 'Пътеводители и истории от 60+ дестинации.',
  url: 'https://belivavip.bg/blog',
  publisher: {
    '@type': 'Organization',
    name: 'Beliva VIP Tour',
    logo: { '@type': 'ImageObject', url: 'https://belivavip.bg/beliva_logo.png' },
  },
};

export type BlogPost = {
  id: string;
  title: string;
  slug?: string;
  excerpt?: string;
  coverImg?: string;
  relatedCountry?: string;
  relatedContinent?: string;
  category?: string;
  author?: string;
  readTime?: number;
  createdAt?: string | null;
};

// Дестинация от каталога — показват се, докато пътеводителят още няма статии
export type BlogDestination = { slug: string; name: string; img?: string; tours: number };

async function getDestinations(): Promise<BlogDestination[]> {
  try {
    const [tours, media] = await Promise.all([getActiveTours(), fetchAllMedia()]);
    const map = new Map<string, { name: string; tours: number; img?: string }>();
    tours.forEach(tour => {
      const list = Array.isArray(tour.country) ? tour.country : String(tour.country || '').split(',');
      list.map(c => c.trim()).filter(Boolean).forEach(name => {
        const entry = map.get(name) || { name, tours: 0 };
        entry.tours += 1;
        if (!entry.img && tour.img && !isOperatorHotlink(tour.img)) entry.img = tour.img;
        map.set(name, entry);
      });
    });
    return [...map.values()]
      .sort((a, b) => b.tours - a.tours || a.name.localeCompare(b.name, 'bg'))
      .slice(0, 8)
      .map(d => ({ slug: slugify(d.name), name: d.name, tours: d.tours, img: findCountryHeroImage(media, d.name) || d.img }));
  } catch {
    return [];
  }
}

function serializePost(id: string, data: any): BlogPost {
  return {
    id,
    title: data.title || '',
    slug: data.slug || '',
    excerpt: data.excerpt || '',
    coverImg: data.coverImg || '',
    relatedCountry: data.relatedCountry || '',
    relatedContinent: data.relatedContinent || '',
    category: data.category || '',
    author: data.author || '',
    readTime: data.readTime || null,
    createdAt: data.createdAt?.toDate
      ? data.createdAt.toDate().toISOString()
      : (data.createdAt || null),
  };
}

export default async function BlogPage() {
  let posts: BlogPost[] = [];

  try {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    posts = snap.docs.map(doc => serializePost(doc.id, doc.data()));
  } catch (err) {
    console.error('Blog fetch error:', err);
  }

  const destinations = posts.length === 0 ? await getDestinations() : [];

  return (
    <>
      <JsonLd data={schemaData} />
      <Suspense fallback={<div className="min-h-screen bg-[#f7f4ee]" />}>
        <BlogListClient posts={posts} destinations={destinations} />
      </Suspense>
    </>
  );
}
