import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { formatTourWithAi } from '@/lib/aiFormatTour';

// AI пренаписване на скрейпнат тур — логиката е в src/lib/aiFormatTour.ts
export async function POST(req: Request) {
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const { scrapedData } = await req.json();
        return NextResponse.json({ success: true, tour: await formatTourWithAi(scrapedData) });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
