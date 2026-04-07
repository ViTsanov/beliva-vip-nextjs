import { MetadataRoute } from 'next';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { slugify } from '@/lib/admin-helpers';
import { getActiveTours } from '@/services/tourService'; // 👈 Импортираме нашия нов сървис

const BASE_URL = 'https://belivavip.bg';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Статични страници
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/about-us`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/contacts`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    // Легални страници
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  // 2. Динамични Екскурзии (Tour Pages)
  let tourRoutes: MetadataRoute.Sitemap = [];
  let countryRoutes: MetadataRoute.Sitemap = []; // Тук пазим филтрите
  
  try {
    // 👇 ИЗПОЛЗВАМЕ АДАПТЕРА ВМЕСТО ДИРЕКТНА ЗАЯВКА 👇
    const tours = await getActiveTours(); 
    
    const uniqueCountries = new Set<string>();

    tourRoutes = tours.map((tour) => {
      // Разделяме държавите, ако са "Намибия, Ботсвана" и ги добавяме поотделно
      if (tour.country) {
        const countriesArray = Array.isArray(tour.country) 
          ? tour.country 
          : typeof tour.country === 'string' ? tour.country.split(',').map((c: string) => c.trim()) : [];
        
        countriesArray.forEach((c: string) => {
           if (c) uniqueCountries.add(c);
        });
      }

      // Използваме slug с приоритет
      return {
        url: `${BASE_URL}/tour/${tour.slug || tour.tourId || tour.id}`, 
        lastModified: tour.updatedAt ? new Date(tour.updatedAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      };
    });

    // 🚀 ГЕНЕРИРАНЕ НА ЛИНКОВЕ ЗА ФИЛТРИ (Държави - вече на чиста латиница чрез slugify)
    countryRoutes = Array.from(uniqueCountries).map((country) => ({
      url: `${BASE_URL}/?country=${slugify(country)}`, 
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8, 
    }));

  } catch (error) {
    console.error("Sitemap tours error:", error);
  }

  // 3. Динамични Блог статии
  // (Засега оставяме блога да си говори директно с Firebase, 
  // докато не направим postService.ts в бъдеще)
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

  // 4. Обединяване на всички генерирани линкове
  return [
    ...staticRoutes,
    ...countryRoutes, 
    ...tourRoutes,
    ...blogRoutes,
  ];
}