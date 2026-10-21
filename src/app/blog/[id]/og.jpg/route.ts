// Снимката за превю на статията — корицата ѝ като JPEG 1200×630
import { getPostData } from '@/lib/blogPost';
import { blogShareSources } from '@/lib/shareMeta';
import { shareImageResponse } from '@/lib/shareImage';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const post = await getPostData((await params).id);
  return shareImageResponse(post ? blogShareSources(post) : []);
}
