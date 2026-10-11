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
        '/checkout/',          // Лични линкове за плащане (с токен)
        '/operator-view/',     // Лични линкове за туроператорите (с токен)
        '/feedback/',          // Лични линкове за обратна връзка след пътуване
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}