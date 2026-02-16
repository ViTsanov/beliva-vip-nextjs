import { MetadataRoute } from 'next';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Промени с твоя реален домейн
const BASE_URL = 'https://belivavip.bg'; // или твоя домейн

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Извличане на всички публични турове
  const toursQuery = query(collection(db, "tours"), where("status", "==", "public"));
  const toursSnapshot = await getDocs(toursQuery);
  
  const tours = toursSnapshot.docs.map((doc) => ({
    url: `${BASE_URL}/tour/${doc.data().tourId || doc.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // 2. Извличане на всички блогове (ако имаш такива)
const postsSnap = await getDocs(collection(db, "posts"));
  const posts = postsSnap.docs.map(doc => {
    const data = doc.data();
    return {
      url: `${BASE_URL}/blog/${data.slug || doc.id}`,
      lastModified: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    };
  });

  // 3. Статични страници
  const routes = [
    '',
    '/about-us',
    '/contacts',
    '/faq',
    '/reviews',
    '/blog',
    '/privacy',
    '/terms',
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.5,
  }));

  return [...routes, ...tours, ...posts];
}