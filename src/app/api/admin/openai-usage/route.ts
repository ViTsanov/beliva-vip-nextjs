import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

// OpenAI Usage API — извлича разход по токени за последните 30 дни.
// ВАЖНО: изисква Admin-ниво API ключ (Settings → Admin keys в platform.openai.com), НЕ същия ключ,
// който се ползва за chatWithAI/ai-format-tour извикванията (OPENAI_API_KEY) — различен scope.
export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const adminKey = process.env.OPENAI_ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json({ error: 'OpenAI Admin ключ не е конфигуриран (липсва OPENAI_ADMIN_KEY)' }, { status: 501 });
  }

  try {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - 30 * 24 * 60 * 60; // последните 30 дни

    const costsRes = await fetch(
      `https://api.openai.com/v1/organization/costs?start_time=${startTime}&end_time=${endTime}&bucket_width=1d&limit=31`,
      { headers: { Authorization: `Bearer ${adminKey}` } }
    );
    const costsData = await costsRes.json();

    if (costsData.error) throw new Error(costsData.error.message);

    // Всеки "bucket" е ден; вътре има резултати по проект/линия — сумираме за общ дневен разход в $
    const daily = (costsData.data || []).map((bucket: any) => {
      const totalUsd = (bucket.results || []).reduce(
        (sum: number, r: any) => sum + (r.amount?.value || 0),
        0
      );
      const d = new Date((bucket.start_time || 0) * 1000);
      return {
        date: `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`,
        cost: Number(totalUsd.toFixed(4)),
      };
    });

    const totalCost = daily.reduce((sum: number, d: any) => sum + d.cost, 0);

    return NextResponse.json({ success: true, daily, totalCost: Number(totalCost.toFixed(2)) });
  } catch (error: unknown) {
    console.error('[OpenAI usage]', error);
    const message = error instanceof Error ? error.message : 'Грешка при връзка с OpenAI';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
