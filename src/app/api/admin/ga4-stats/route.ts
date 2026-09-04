import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

// Минимален локален тип за ред от GA4 отговор — вместо да разчитаме на точното име на SDK типа (което
// варира между версии), типизираме само каквото реално четем от него.
interface GaRow {
  dimensionValues?: { value?: string | null }[] | null;
  metricValues?: { value?: string | null }[] | null;
}

// GA4 Data API — извлича посещения/трафик/топ страници за последните 28 дни.
// Изисква service account с Viewer достъп до GA4 property-то (виж инструкциите в admin панела,
// секция "Маркетинг", ако GA4_* променливите липсват).
export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  // Private key-овете идват от .env файлове/Secret Manager с буквални "\n" вместо истински нови редове —
  // трябва да ги превърнем обратно, иначе Google's SDK не може да parse-не ключа.
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!propertyId || !clientEmail || !privateKey) {
    return NextResponse.json({ error: 'GA4 не е конфигуриран (липсват GA4_PROPERTY_ID / GA4_CLIENT_EMAIL / GA4_PRIVATE_KEY)' }, { status: 501 });
  }

  try {
    const client = new BetaAnalyticsDataClient({
      credentials: { client_email: clientEmail, private_key: privateKey },
    });

    // 1. Дневни активни потребители / сесии / прегледи за последните 28 дни
    const [dailyReport] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });

    const daily = (dailyReport.rows || []).map((row: GaRow) => {
      const raw = row.dimensionValues?.[0]?.value || '';
      // GA връща дати като YYYYMMDD — форматираме за четимост
      const label = raw.length === 8 ? `${raw.slice(6, 8)}.${raw.slice(4, 6)}` : raw;
      return {
        date: label,
        activeUsers: Number(row.metricValues?.[0]?.value || 0),
        sessions: Number(row.metricValues?.[1]?.value || 0),
        pageViews: Number(row.metricValues?.[2]?.value || 0),
      };
    });

    // 2. Топ 8 страници по прегледи
    const [pagesReport] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 8,
    });
    const topPages = (pagesReport.rows || []).map((row: GaRow) => ({
      path: row.dimensionValues?.[0]?.value || '',
      views: Number(row.metricValues?.[0]?.value || 0),
    }));

    // 3. Канали на трафика (organic, direct, referral, paid...)
    const [sourcesReport] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    });
    const sources = (sourcesReport.rows || []).map((row: GaRow) => ({
      channel: row.dimensionValues?.[0]?.value || 'Неизвестно',
      sessions: Number(row.metricValues?.[0]?.value || 0),
    }));

    // 4. Обобщени тотали за последните 28 дни (за горните карти с числа)
    const totals = daily.reduce(
      (acc, d) => ({
        activeUsers: acc.activeUsers + d.activeUsers,
        sessions: acc.sessions + d.sessions,
        pageViews: acc.pageViews + d.pageViews,
      }),
      { activeUsers: 0, sessions: 0, pageViews: 0 }
    );

    return NextResponse.json({ success: true, daily, topPages, sources, totals });
  } catch (error: unknown) {
    console.error('[GA4 stats]', error);
    const message = error instanceof Error ? error.message : 'Грешка при връзка с Google Analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
