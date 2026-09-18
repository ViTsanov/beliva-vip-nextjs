import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { decryptField } from '@/lib/encryption';

// Декриптира ЕГН/номер на паспорт за подаден списък пътници — само за логнат админ. Приема данните
// директно (не търси по ID), защото и ReservationsTab.tsx, и ClientDetailModal.tsx вече имат
// криптираните данни заредени локално (от inquiry.travelers или trip.travelers) — няма нужда от
// допълнително четене от Firestore тук.
export async function POST(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { travelers } = await request.json();
    if (!Array.isArray(travelers)) {
      return NextResponse.json({ error: 'Липсва списък с пътници' }, { status: 400 });
    }

    const decrypted = travelers.map((t: any) => ({
      latinName: t.latinName || '',
      egn: t.egn ? decryptField(t.egn) : '',
      passportNumber: t.passportNumber ? decryptField(t.passportNumber) : '',
      passportValidity: t.passportValidity || '',
    }));

    return NextResponse.json({ success: true, travelers: decrypted });
  } catch (error: unknown) {
    console.error('[decrypt-travelers]', error);
    const message = error instanceof Error ? error.message : 'Грешка при декриптиране на данните';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
