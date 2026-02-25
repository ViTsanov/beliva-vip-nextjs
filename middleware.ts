import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  
  // 1. ПРОВЕРКА: РОБОТ ИЛИ ЧОВЕК? (Точно както в стария ти код)
  const isBot = [
    "facebookexternalhit", "twitterbot", "linkedinbot", 
    "whatsapp", "viber", "skype", "discordbot", "slackbot",
    "telegram", "applebot", "googlebot" 
  ].some(bot => userAgent.includes(bot));

  const urlPath = request.nextUrl.pathname;

  // 2. АКО Е РОБОТ -> Пренасочваме го тайно към нашия генератор на HTML
  if (isBot && (urlPath.startsWith('/tour/') || urlPath.startsWith('/blog/'))) {
    const type = urlPath.startsWith('/tour/') ? 'tour' : 'blog';
    const id = urlPath.split('/').pop() || '';
    
    // Rewrite скрива пренасочването от Facebook - той си мисли, че отваря нормалния линк
    return NextResponse.rewrite(new URL(`/api/bot-meta?type=${type}&id=${id}`, request.url));
  }

  // 3. АКО Е ЧОВЕК -> Продължава към нормалния сайт
  return NextResponse.next();
}

// Указваме на кои пътища да се пуска този светофар, за да не бави сайта
export const config = {
  matcher: ['/tour/:path*', '/blog/:path*'],
};