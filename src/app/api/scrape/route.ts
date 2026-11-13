import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { scrapeTourUrl, ScrapeError } from '@/lib/scrapers/scrapeTour';

// Изтегля програма от 2МКО или Дари Тур — логиката е в src/lib/scrapers/scrapeTour.ts
export async function POST(req: Request) {
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ error: 'Липсва линк' }, { status: 400 });
        return NextResponse.json(await scrapeTourUrl(url));
    } catch (error: unknown) {
        const status = error instanceof ScrapeError ? error.status : 500;
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Грешка' }, { status });
    }
}
