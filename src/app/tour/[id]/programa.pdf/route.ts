// /tour/<id>/programa.pdf — програмата на екскурзията като PDF (бутонът „Изтегли програмата“ под цената).
// Генерира се от записаните в базата данни, затова всяка редакция в админ панела влиза в PDF-а. Линкът на
// страницата носи ?v=<последна редакция>, така че кешът (CDN) никога не връща стара версия след промяна.

import { NextResponse } from 'next/server';
import { getTourBySlug } from '@/services/tourService';
import { renderTourPdf, pdfFileName } from '@/lib/pdf/renderTourPdf';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tour = await getTourBySlug(id);
  // Само публикувани турове — чакащите одобрение се преглеждат през админ панела
  if (!tour || tour.status !== 'public') {
    return NextResponse.json({ error: 'Екскурзията не е намерена' }, { status: 404 });
  }
  // Ръчно качен PDF има предимство пред генерирания
  if (tour.pdfUrl) return NextResponse.redirect(tour.pdfUrl, 307);

  try {
    const pdf = await renderTourPdf(tour);
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        // inline: телефонът/браузърът го отваря директно; „Запази“ дава хубаво име на файла
        'Content-Disposition': `inline; filename="${pdfFileName(tour)}"`,
        'Cache-Control': 'public, max-age=600, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('[tour-pdf] грешка при генериране:', id, error);
    return NextResponse.json({ error: 'PDF-ът не можа да бъде създаден' }, { status: 500 });
  }
}
