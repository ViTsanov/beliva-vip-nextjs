import type { Metadata } from 'next';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import BlogListClient from './BlogListClient';
import { Suspense } from 'react';

export const revalidate = 1800; // refresh every 30 min

export const metadata: Metadata = {
  title: { absolute: 'Пътеводител и Блог | Beliva VIP Tour' },
  description: 'Пътеводители, съвети и истории от пътешествия до Япония, Австралия, Тайланд, Перу и още 60+ дестинации. Четете преди да тръгнете.',
  alternates: { canonical: 'https://belivavip.bg/blog' },
  openGraph: {
    type: 'website',
    url: 'https://belivavip.bg/blog',
    title: 'Пътеводител и Блог | Beliva VIP Tour',
    description: 'Статии и пътеводители за над 60 дестинации.',
    images: [{ url: 'https://belivavip.bg/beliva_logo.png', width: 1200, height: 630 }],
  },
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <Suspense fallback={<div className="min-h-screen bg-[#f9f6f0]" />}>
        <BlogListClient posts={posts} />
      </Suspense>
    </>
  );
}
