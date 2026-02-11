import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const BASE_URL = 'https://belivavip.bg'; // Твоя домейн

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin-beliva-2025/', // Скрий админа
        '/login-vip/',         // Скрий логина
        '/api/',               // Скрий API пътищата
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}