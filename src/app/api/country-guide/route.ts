import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/adminAuth';
import { canonicalCountries } from '@/lib/constants';
import { slugify } from '@/lib/admin-helpers';
import { generateCountryGuide, readCountryGuide } from '@/lib/countryGuide';

// Пише текста „За <държава>“ (src/lib/countryGuide.ts) за държави, които още нямат такъв.
// Вика се от TourForm след запис на тур — така новата държава има текст, преди първият посетител да отвори
// страницата ѝ. С regenerate: true текстът се пише наново, дори да съществува.
export const maxDuration = 60;

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await req.json().catch(() => ({}));
  const raw: unknown = body?.countries;
  const list = Array.isArray(raw) ? raw.filter((c): c is string => typeof c === 'string' && !!c.trim()) : [];
  const countries = canonicalCountries(list).slice(0, 10);
  if (countries.length === 0) return NextResponse.json({ error: 'Няма държави' }, { status: 400 });

  const results: Record<string, 'written' | 'exists' | string> = {};
  for (const country of countries) {
    try {
      if (!body?.regenerate && (await readCountryGuide(country))) {
        results[country] = 'exists';
        continue;
      }
      await generateCountryGuide(country);
      revalidatePath(`/destinations/${slugify(country)}`);
      results[country] = 'written';
    } catch (e) {
      results[country] = e instanceof Error ? e.message : 'грешка';
    }
  }
  return NextResponse.json({ results });
}
