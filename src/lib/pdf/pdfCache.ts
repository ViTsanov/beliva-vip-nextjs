// Запазени PDF програми: всяка програма се генерира веднъж и се пази във Firebase Storage
// (tour-pdfs/<id на тура>.pdf). Следващите отваряния взимат готовия файл.
//
// Файлът се генерира наново, когато се промени съдържанието му: редакция на тура, изтекла промоция,
// минала дата на тръгване (в PDF-а са само предстоящите дати) или нов дизайн (TEMPLATE_VERSION).
// Затова „версията“ е отпечатък от самите данни на PDF-а, а не от датата на редакция.

import { createHash } from 'node:crypto';
import { getAdminStorage } from '@/lib/firebaseAdmin';
import { renderTourPdf, toPdfData, type PdfSourceTour } from './renderTourPdf';

// Смени при промяна в дизайна на PDF-а (TourProgramPdf.tsx) — всички програми ще се генерират наново.
export const TEMPLATE_VERSION = '2026-11-13';

export const PDF_PREFIX = 'tour-pdfs/';

export const pdfKey = (tour: PdfSourceTour) => String(tour.id || tour.tourId || tour.slug || '').replace(/[^A-Za-z0-9_-]/g, '_');

export function pdfVersion(tour: PdfSourceTour): string {
  const data = JSON.stringify({ data: toPdfData(tour), img: tour.img || '', tpl: TEMPLATE_VERSION });
  return createHash('sha1').update(data).digest('hex').slice(0, 16);
}

function bucketFile(tour: PdfSourceTour) {
  try {
    return getAdminStorage().bucket().file(`${PDF_PREFIX}${pdfKey(tour)}.pdf`);
  } catch (error) {
    // Без Firebase Admin (липсващи ключове) сайтът пак работи — просто генерира всеки път
    console.error('[pdf-cache] Storage не е достъпен:', error);
    return null;
  }
}

export async function getTourPdf(tour: PdfSourceTour, { force = false } = {}): Promise<{ pdf: Buffer; cached: boolean; generatedAt: string; version: string }> {
  const version = pdfVersion(tour);
  const file = pdfKey(tour) ? bucketFile(tour) : null;

  if (file && !force) {
    try {
      const [meta] = await file.getMetadata();
      if (meta.metadata?.version === version) {
        const [pdf] = await file.download();
        return { pdf, cached: true, generatedAt: String(meta.metadata?.generatedAt || meta.updated || ''), version };
      }
    } catch {
      // Файлът още не съществува — генерираме го по-долу
    }
  }

  const pdf = await renderTourPdf(tour);
  const generatedAt = new Date().toISOString();
  if (file) {
    try {
      await file.save(pdf, {
        resumable: false,
        contentType: 'application/pdf',
        metadata: { metadata: { version, generatedAt, title: String(tour.title || '').slice(0, 200) } },
      });
    } catch (error) {
      console.error('[pdf-cache] PDF-ът не се запази:', error);
    }
  }
  return { pdf, cached: false, generatedAt, version };
}

export interface StoredPdf { key: string; version: string; generatedAt: string; size: number }

export async function listStoredPdfs(): Promise<StoredPdf[]> {
  const [files] = await getAdminStorage().bucket().getFiles({ prefix: PDF_PREFIX });
  return files
    .filter(f => f.name.endsWith('.pdf'))
    .map(f => ({
      key: f.name.slice(PDF_PREFIX.length, -4),
      version: String(f.metadata?.metadata?.version || ''),
      generatedAt: String(f.metadata?.metadata?.generatedAt || f.metadata?.updated || ''),
      size: Number(f.metadata?.size || 0),
    }));
}
