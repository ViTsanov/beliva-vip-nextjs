// Снимката за превю на страницата на държавата — главната ѝ снимка като JPEG 1200×630
import { getActiveTours } from '@/services/tourService';
import { slugify } from '@/lib/admin-helpers';
import { fetchAllMedia } from '@/lib/media-helpers';
import { resolveCountryName, resolveHeroImage, tourCountryList } from '@/lib/countryPage';
import { isPublicPhoto } from '@/lib/shareMeta';
import { shareImageResponse } from '@/lib/shareImage';

export async function GET(_req: Request, { params }: { params: Promise<{ country: string }> }) {
  const countrySlug = (await params).country;
  const tours = (await getActiveTours()).filter(tour => tourCountryList(tour).some(c => slugify(c) === countrySlug));
  const hero = tours.length > 0 ? resolveHeroImage(await fetchAllMedia(), resolveCountryName(countrySlug, tours), tours) : null;
  return shareImageResponse(isPublicPhoto(hero) ? [hero] : []);
}
