import { MetadataRoute } from 'next';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const BASE_URL = 'https://belivavip.bg';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Статични страници
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/about-us`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contacts`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    // Легални страници
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  // 2. Динамични Екскурзии (Tour Pages)
  let tourRoutes: MetadataRoute.Sitemap = [];
  let countryRoutes: MetadataRoute.Sitemap = []; // 👈 Тук ще пазим филтрите
  
  try {
    const qTours = query(collection(db, "tours"), where("status", "==", "public"));
    const tourSnapshot = await getDocs(qTours);
    
    // Събираме и уникалните държави докато обхождаме туровете
    const uniqueCountries = new Set<string>();

    tourRoutes = tourSnapshot.docs.map((doc) => {
      const data = doc.data();
      
      // Добавяме държавата в списъка за уникални
      if (data.country) uniqueCountries.add(data.country);

      return {
        url: `${BASE_URL}/tour/${data.tourId || doc.id}`, // Ползваме tourId ако има
        lastModified: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      };
    });

    // 3. 🚀 ГЕНЕРИРАНЕ НА ЛИНКОВЕ ЗА ФИЛТРИ (ДЪРЖАВИ)
    // Google игнорира хашове (#tours-grid), затова ги махаме от sitemap-а,
    // но параметрите (?country=...) са валидни.
    countryRoutes = Array.from(uniqueCountries).map((country) => ({
      url: `${BASE_URL}/?country=${encodeURIComponent(country)}`, 
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8, // Висок приоритет, защото са като Landing Pages
    }));

  } catch (error) {
    console.error("Sitemap tours error:", error);
  }

  // 4. Динамични Блог статии
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

  // 5. Обединяване на всичко
  return [
    ...staticRoutes,
    ...countryRoutes, // 👈 Добавяме държавите тук
    ...tourRoutes,
    ...blogRoutes,
  ];
}