// „Преглед на PDF“ в админ панела: PDF от данните във формата на тура — включително незаписаните промени,
// за да се провери документът преди запис и публикуване.

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { renderTourPdf, pdfFileName, type PdfSourceTour } from '@/lib/pdf/renderTourPdf';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { tour } = (await req.json()) as { tour: PdfSourceTour };
    if (!tour?.title) return NextResponse.json({ error: 'Липсва заглавие на екскурзията' }, { status: 400 });

    const pdf = await renderTourPdf(tour);
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${pdfFileName(tour)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[tour-pdf] грешка при преглед:', error);
    return NextResponse.json({ error: 'PDF-ът не можа да бъде създаден' }, { status: 500 });
  }
}
