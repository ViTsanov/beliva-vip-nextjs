// Админ панел → „PDF програми“: кои програми са запазени, кои са остарели (турът е променен) и кои липсват.
// GET  — списък на всички публикувани турове със състоянието на PDF-а им
// POST { id } — генерира наново PDF-а на един тур и го запазва

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { normalizeTour } from '@/services/tourService';
import { getTourPdf, listStoredPdfs, pdfKey, pdfVersion } from '@/lib/pdf/pdfCache';
import { REIMPORT_VERSION } from '@/lib/reimportVersion';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    const [toursSnap, stored] = await Promise.all([
      getAdminDb().collection('tours').where('status', '==', 'public').get(),
      listStoredPdfs(),
    ]);
    const byKey = new Map(stored.map(s => [s.key, s]));
    const items = toursSnap.docs.map(d => {
      const tour = normalizeTour(d.data(), d.id);
      const file = byKey.get(pdfKey(tour));
      const status = tour.pdfUrl ? 'manual' : !file ? 'missing' : file.version === pdfVersion(tour) ? 'fresh' : 'stale';
      // Турове на 2МКО, внесени преди 03.11.2026, нямат тези подробности — бутонът „Допълни от 2МКО“ ги добавя
      const raw = tour as unknown as { externalSourceLink?: string; originalUrl?: string; reimportVersion?: number };
      const link = String(raw.externalSourceLink || raw.originalUrl || '');
      const fromTwoMko = /(^|\.)2mko\.com\//.test(link.replace(/^https?:\/\//, ''));
      const lacks = fromTwoMko ? [
        !(Array.isArray(tour.extras) && tour.extras.length) && 'допълнителни екскурзии',
        !tour.deposit && 'депозит',
        !tour.singleSupplement && 'единична стая',
        !String(tour.flightInfo || '').trim() && 'полети',
      ].filter(Boolean) as string[] : [];
      // След ново внасяне (с актуалните правила) липсващото го няма и при 2МКО — не е задача, а информация
      const checkedAtSource = (raw.reimportVersion || 0) >= REIMPORT_VERSION;
      return {
        canEnrich: fromTwoMko,
        lacks: checkedAtSource ? [] : lacks,
        notAtSource: checkedAtSource ? lacks : [],
        id: tour.id,
        slug: tour.tourId || tour.slug || tour.id,
        title: tour.title,
        operator: tour.operator || '',
        pdfUrl: tour.pdfUrl || '',
        status,
        generatedAt: file?.generatedAt || '',
        size: file?.size || 0,
      };
    });
    items.sort((a, b) => a.title.localeCompare(b.title, 'bg'));
    return NextResponse.json({ items });
  } catch (error) {
    console.error('[pdf-library] GET', error);
    return NextResponse.json({ error: 'Списъкът не можа да се зареди' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    const { id } = (await req.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: 'Липсва id' }, { status: 400 });
    const snap = await getAdminDb().collection('tours').doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: 'Турът не е намерен' }, { status: 404 });
    const tour = normalizeTour(snap.data()!, snap.id);
    const { generatedAt, pdf } = await getTourPdf(tour, { force: true });
    return NextResponse.json({ ok: true, generatedAt, size: pdf.length });
  } catch (error) {
    console.error('[pdf-library] POST', error);
    return NextResponse.json({ error: 'PDF-ът не можа да бъде създаден' }, { status: 500 });
  }
}
