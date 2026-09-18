import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { encryptField } from '@/lib/encryption';

// Криптира и записва ЕГН/номер на паспорт директно върху клиентския документ (customers/{id}) — само за
// логнат админ. Криптирането е ИЗКЛЮЧИТЕЛНО сървърно, тук — никога не минава през браузъра в чист вид
// на път към базата. latinName/passportValidity остават в чист текст (не сами по себе си идентифициращи
// стойности), само за display удобство.
export async function POST(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { customerId, latinName, egn, passportNumber, passportValidity } = await request.json();
    if (!customerId || typeof customerId !== 'string') {
      return NextResponse.json({ error: 'Липсва customerId' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('customers').doc(customerId).update({
      latinName: (latinName || '').trim(),
      egn: egn ? encryptField(egn.trim()) : '',
      passportNumber: passportNumber ? encryptField(passportNumber.trim()) : '',
      passportValidity: (passportValidity || '').trim(),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[save-client-sensitive-data]', error);
    const message = error instanceof Error ? error.message : 'Грешка при запис на данните';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
