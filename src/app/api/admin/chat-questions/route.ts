import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getAdminDb } from '@/lib/firebaseAdmin';

// Групира логнатите AI чат въпроси по ТОЧНО съвпадение (case-insensitive, trimmed) и връща най-често
// задаваните, подредени по брой. Просто броене, не AI категоризация — различно фразирани, но
// смислово еднакви въпроси НЕ се групират заедно (напр. "Колко струва Япония?" и "Каква е цената на
// Япония?" се броят отделно).
export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const db = getAdminDb();

    // Лимит от 500 най-скорошни — разумен таван, за да не тегли цялата колекция, ако е нараснала много.
    const snap = await db.collection('chatQuestions')
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();

    const counts = new Map<string, { count: number; example: string }>();
    snap.forEach(doc => {
      const data = doc.data();
      const key = data.normalized;
      if (!key || typeof key !== 'string') return;
      const existing = counts.get(key);
      if (existing) {
        existing.count++;
      } else {
        counts.set(key, { count: 1, example: data.message || key });
      }
    });

    const topQuestions = Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
      .map(v => ({ question: v.example, count: v.count }));

    return NextResponse.json({
      success: true,
      topQuestions,
      totalQuestions: snap.size,
      uniqueQuestions: counts.size,
    });
  } catch (error: unknown) {
    console.error('[chat-questions]', error);
    const message = error instanceof Error ? error.message : 'Грешка при извличане на въпросите';
    // Firebase Admin config грешки третираме като "не е конфигурирано" (501), не като истинска 500 грешка —
    // за да покажем в admin панела инструкциите за настройка, не червен error box.
    const isConfigError = message.includes('не е конфигуриран');
    return NextResponse.json({ error: message }, { status: isConfigError ? 501 : 500 });
  }
}
