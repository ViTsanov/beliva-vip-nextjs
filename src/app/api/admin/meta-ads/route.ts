import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

// Meta Marketing API (Ads Insights) — извлича разход/impressions/кликове за последните 30 дни.
// Изисква реална рекламна кампания в Ads Manager — самият Pixel няма собствено "четимо" API,
// той само изпраща събития към Facebook. Виж инструкциите в admin панела, секция "Маркетинг".
export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID; // формат: act_1234567890

  if (!accessToken || !adAccountId) {
    return NextResponse.json({ error: 'Meta реклами не са конфигурирани (липсват META_ACCESS_TOKEN / META_AD_ACCOUNT_ID)' }, { status: 501 });
  }

  try {
    const fields = 'spend,impressions,clicks,cpc,ctr,reach,date_start,date_stop';
    const url = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${fields}&time_increment=1&date_preset=last_30d&access_token=${accessToken}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.error) throw new Error(data.error.message);

    const daily = (data.data || []).map((row: any) => {
      const d = new Date(row.date_start);
      return {
        date: `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`,
        spend: Number(row.spend || 0),
        impressions: Number(row.impressions || 0),
        clicks: Number(row.clicks || 0),
        ctr: Number(row.ctr || 0),
      };
    });

    const totals = daily.reduce(
      (acc: any, d: any) => ({
        spend: acc.spend + d.spend,
        impressions: acc.impressions + d.impressions,
        clicks: acc.clicks + d.clicks,
      }),
      { spend: 0, impressions: 0, clicks: 0 }
    );

    return NextResponse.json({ success: true, daily, totals });
  } catch (error: unknown) {
    console.error('[Meta ads]', error);
    const message = error instanceof Error ? error.message : 'Грешка при връзка с Meta';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
