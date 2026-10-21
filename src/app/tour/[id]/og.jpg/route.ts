// Снимката за превю на тура (Facebook, Messenger, Google) — основната му снимка като JPEG 1200×630
import { getTourBySlug } from '@/services/tourService';
import { tourShareSources } from '@/lib/shareMeta';
import { shareImageResponse } from '@/lib/shareImage';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tour = await getTourBySlug((await params).id);
  return shareImageResponse(tour ? tourShareSources(tour) : []);
}
