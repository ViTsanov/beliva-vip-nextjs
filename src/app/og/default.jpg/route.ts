// Снимката за превю на страниците без собствена снимка (контакти, въпроси, отзиви…) — JPEG 1200×630
import { jpegResponse, renderDefault } from '@/lib/shareImage';

// Прави се веднъж при build — снимката е от /public и не зависи от базата
export const dynamic = 'force-static';

export async function GET() {
  return jpegResponse(await renderDefault());
}
