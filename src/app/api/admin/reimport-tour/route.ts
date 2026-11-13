// „Внеси наново от 2МКО“: пълното внасяне (страница + Word файл → AI пише програмата) за ВЕЧЕ съществуващ тур,
// записано в същия тур. Сменят се само текстовете и подробностите от туроператора:
//   програмата по дни (с [*N] за допълнителните екскурзии), включва / не включва, документи, допълнителна
//   информация, допълнителни екскурзии с цени, депозит, единична стая, полети, маршрут, брой дни/нощувки.
// Остават: ID и адресът на страницата, заглавието, въведението, цената, датите, снимките, статусът, промоцията,
// категориите — и всички връзки със запитвания, резервации и клиенти.

import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAdmin } from '@/lib/adminAuth';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { scrapeTourUrl, ScrapeError } from '@/lib/scrapers/scrapeTour';
import { formatTourWithAi } from '@/lib/aiFormatTour';
import { splitListText } from '@/lib/listItems';
import { REIMPORT_VERSION } from '@/lib/reimportVersion';

export const runtime = 'nodejs';
// AI пише програмата на части — за дълги турове (20+ дни) отнема 1–2 минути
export const maxDuration = 300;

const joinArr = (arr: unknown) => (Array.isArray(arr) ? arr.join('\n') : String(arr || ''));
// Същото почистване като при внасяне на нов тур: махаме водещо „N ден – 28.08.2026“ (дублира заглавието на деня)
const DAY_PREFIX = /^\s*\d{1,2}\s*(?:-?\s*(?:ви|ри|ти|ми|ва))?\s*ден\s*[–\-—]?\s*(?:\d{2}\.\d{2}\.\d{4})?\s*[–\-—:]?\s*/i;

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { id } = (await req.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: 'Липсва id' }, { status: 400 });
    const ref = getAdminDb().collection('tours').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'Турът не е намерен' }, { status: 404 });
    const tour = snap.data()!;

    const url = String(tour.externalSourceLink || tour.originalUrl || '');
    if (!url) return NextResponse.json({ error: 'Турът няма линк към туроператора' }, { status: 400 });

    const scraped = await scrapeTourUrl(url);
    if (!Array.isArray(scraped.program) || !scraped.program.length) {
      return NextResponse.json({ error: 'При туроператора не се прочете програма по дни — страницата може да е сменена' }, { status: 422 });
    }
    // Полетите не минават през AI — часовете и номерата на полетите се пазят дума по дума
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ai = (await formatTourWithAi({ ...scraped, flightInfo: undefined })) as Record<string, any>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itinerary = (ai.program || []).map((p: any, idx: number) => ({
      day: p.day || idx + 1,
      title: p.title || `Ден ${p.day || idx + 1}`,
      content: String(p.description || p.content || '').replace(DAY_PREFIX, ''),
    }));
    if (!itinerary.length) return NextResponse.json({ error: 'AI не върна програма — опитай пак след малко' }, { status: 502 });

    const notIncluded = splitListText(ai.excludes);
    const patch: Record<string, unknown> = {
      itinerary,
      included: splitListText(ai.includes),
      notIncluded,
      // Старите записи понякога имат и „excluded“ — сайтът чете първо него, затова се обновява заедно
      ...(tour.excluded !== undefined && { excluded: notIncluded }),
      documents: splitListText(ai.docs),
      generalInfo: joinArr(ai.info),
      extras: ai.extras || [],
      singleSupplement: ai.singleSupplement || tour.singleSupplement || '',
      deposit: ai.deposit || tour.deposit || '',
      flightInfo: scraped.flightInfo || tour.flightInfo || '',
      ...(ai.route && { route: ai.route }),
      ...(ai.days && { durationDays: String(ai.days), duration: String(ai.days) }),
      ...(ai.nights && { nights: String(ai.nights) }),
      ...(scraped.title && { sourceTitle: scraped.title }),
      reimportedAt: new Date().toISOString(),
      // Версия на правилата за внасяне: от 2 нататък се чете и доплащането за единична стая без AI. „PDF програми“
      // показва „при 2МКО няма“ вместо „Липсва“ само за турове, внесени с тази или по-нова версия.
      reimportVersion: REIMPORT_VERSION,
      // updatedAt се сменя — така PDF програмата се създава наново, а линкът на сайта получава нова версия
      updatedAt: FieldValue.serverTimestamp(),
    };
    await ref.update(patch);

    return NextResponse.json({
      ok: true,
      days: itinerary.length,
      extras: (ai.extras || []).length,
      deposit: patch.deposit,
      singleSupplement: patch.singleSupplement,
      flights: String(patch.flightInfo).split('\n').filter(Boolean).length,
    });
  } catch (error) {
    console.error('[reimport-tour]', error);
    const status = error instanceof ScrapeError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Грешка при внасянето' }, { status });
  }
}
