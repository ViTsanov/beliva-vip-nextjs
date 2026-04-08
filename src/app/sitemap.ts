import { MetadataRoute } from 'next';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { slugify } from '@/lib/admin-helpers';
import { getActiveTours } from '@/services/tourService';

const BASE_URL = 'https://belivavip.bg';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Статични страници
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/about-us`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/contacts`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  let tourRoutes: MetadataRoute.Sitemap = [];
  let destinationRoutes: MetadataRoute.Sitemap = []; 
  
  try {
    const tours = await getActiveTours();
    const uniqueCountries = new Set<string>();

    tourRoutes = tours.map((tour) => {
      // Събираме уникалните държави за новите дестинационни страници
      if (tour.country) {
        const countriesArray = Array.isArray(tour.country) 
          ? tour.country 
          : typeof tour.country === 'string' ? tour.country.split(',').map((c: string) => c.trim()) : [];
        
        countriesArray.forEach((c: string) => { if (c) uniqueCountries.add(c); });
      }

      return {
        url: `${BASE_URL}/tour/${tour.slug || tour.tourId || tour.id}`, 
        lastModified: tour.updatedAt ? new Date(tour.updatedAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      };
    });

    // 🚀 НОВО: Генерираме линкове към /destinations/държава
    destinationRoutes = Array.from(uniqueCountries).map((country) => ({
      url: `${BASE_URL}/destinations/${slugify(country)}`, 
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85, // Малко по-висок приоритет от обикновен филтър
    }));

  } catch (error) {
    console.error("Sitemap tours error:", error);
  }

  // 3. Динамични Блог статии
  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const blogSnapshot = await getDocs(collection(db, "posts"));
    blogRoutes = blogSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        url: `${BASE_URL}/blog/${data.slug || doc.id}`,
        lastModified: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      };
    });
  } catch (error) {
    console.error("Sitemap blog error:", error);
  }

  return [
    ...staticRoutes,
    ...destinationRoutes, // Google вече ще индексира тези красиви страници
    ...tourRoutes,
    ...blogRoutes,
  ];
}