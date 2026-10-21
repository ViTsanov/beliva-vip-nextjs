// Снимката за превю на началната страница — първият слайд на hero-то, JPEG 1200×630
import { HERO_SHARE_PHOTOS } from '@/lib/shareMeta';
import { shareImageResponse } from '@/lib/shareImage';

// Прави се веднъж при build — снимката е от /public и не зависи от базата
export const dynamic = 'force-static';

export async function GET() {
  return shareImageResponse(HERO_SHARE_PHOTOS.slice(0, 1));
}
