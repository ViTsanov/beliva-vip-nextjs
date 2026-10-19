import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/adminAuth';
import { canonicalCountry } from '@/lib/constants';
import { slugify } from '@/lib/admin-helpers';
import { listCountryGuides, saveCountryGuideEdit } from '@/lib/countryGuide';
import { COUNTRY_GUIDE_MAX_WORDS, sectionWords } from '@/lib/countryGuideWords';
import { getActiveTours } from '@/services/tourService';

// Текстовете „За <държава>“ за админ таба „Текстове за държави“ (CountryGuidesTab.tsx).
// GET — държавите от каталога и записаните текстове; PUT — ръчна редакция на един.
// Писането наново с ИИ е в /api/country-guide.

export type CatalogueCountry = { name: string; slug: string; tours: number };

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const [guides, tours] = await Promise.all([listCountryGuides(), getActiveTours()]);
    // Държавите от активните оферти — същият източник като /destinations (тур с няколко държави влиза във всяка)
    const countries = new Map<string, CatalogueCountry>();
    tours.forEach((tour) => {
      const names = Array.isArray(tour.country) ? tour.country : String(tour.country || '').split(',');
      new Set(names.map(canonicalCountry).filter(Boolean)).forEach((name) => {
        const slug = slugify(name);
        if (!slug) return;
        const entry = countries.get(slug) || { name, slug, tours: 0 };
        entry.tours += 1;
        countries.set(slug, entry);
      });
    });
    return NextResponse.json({ guides, countries: [...countries.values()] });
  } catch (e) {
    console.error('[country-guides] четене', e);
    return NextResponse.json({ error: 'Текстовете не можаха да се заредят' }, { status: 500 });
  }
}

const text = (value: unknown) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

export async function PUT(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await req.json().catch(() => ({}));
  const country = canonicalCountry(text(body?.country));
  if (!country || !slugify(country)) return NextResponse.json({ error: 'Липсва държава' }, { status: 400 });

  const edit = {
    tagline: text(body?.tagline),
    history: text(body?.history),
    geography: text(body?.geography),
    economy: text(body?.economy),
    facts: text(body?.facts),
  };
  if (!edit.history || !edit.geography || !edit.economy || !edit.facts) {
    return NextResponse.json({ error: 'Попълнете и четирите раздела: история, география, икономика и интересни факти.' }, { status: 400 });
  }
  const words = sectionWords(edit);
  if (words > COUNTRY_GUIDE_MAX_WORDS) {
    return NextResponse.json({
      error: `Текстът е ${words} думи — разрешени са най-много ${COUNTRY_GUIDE_MAX_WORDS} общо в четирите раздела. Съкратете го с ${words - COUNTRY_GUIDE_MAX_WORDS}.`,
    }, { status: 400 });
  }

  try {
    const guide = await saveCountryGuideEdit(country, edit);
    revalidatePath(`/destinations/${slugify(country)}`);
    return NextResponse.json({ guide });
  } catch (e) {
    console.error('[country-guides] запис', country, e);
    return NextResponse.json({ error: 'Грешка при запис' }, { status: 500 });
  }
}
