// /tour/<id>/programa.pdf — програмата на екскурзията като PDF (бутонът „Изтегли програмата“ под цената,
// линковете в офертите и в админ панела → „PDF програми“).
// Генерира се веднъж от записаните данни и се пази в Storage (src/lib/pdf/pdfCache.ts); при промяна на тура
// се генерира наново при следващото отваряне. Линкът на страницата носи ?v=<последна редакция> заради CDN кеша.

import { NextResponse } from 'next/server';
import { getTourBySlug } from '@/services/tourService';
import { pdfFileName } from '@/lib/pdf/renderTourPdf';
import { getTourPdf } from '@/lib/pdf/pdfCache';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tour = await getTourBySlug(id);
  // Само публикувани турове — чакащите одобрение се преглеждат през админ панела
  if (!tour || tour.status !== 'public') {
    return NextResponse.json({ error: 'Екскурзията не е намерена' }, { status: 404 });
  }
  // Ръчно качен PDF има предимство пред генерирания
  if (tour.pdfUrl) return NextResponse.redirect(tour.pdfUrl, 307);

  try {
    const { pdf, version } = await getTourPdf(tour);
    // Линковете в офертите и в „PDF програми“ са без ?v=, затова браузърът и CDN-ът НЕ пазят стар файл:
    // всяко отваряне пита сървъра, а той връща готовия файл от Storage (или 304, ако е същият).
    const etag = `"${version}"`;
    const headers = {
      'Content-Type': 'application/pdf',
      // inline: телефонът/браузърът го отваря директно; „Запази“ дава хубаво име на файла
      'Content-Disposition': `inline; filename="${pdfFileName(tour)}"`,
      'Cache-Control': 'public, max-age=0, s-maxage=60, must-revalidate',
      ETag: etag,
    };
    if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
    return new Response(new Uint8Array(pdf), { headers });
  } catch (error) {
    console.error('[tour-pdf] грешка при генериране:', id, error);
    return NextResponse.json({ error: 'PDF-ът не можа да бъде създаден' }, { status: 500 });
  }
}
