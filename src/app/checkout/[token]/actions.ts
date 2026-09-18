'use server';

import { getAdminDb } from '@/lib/firebaseAdmin';
import { encryptField } from '@/lib/encryption';
import { FieldValue } from 'firebase-admin/firestore';

// Server Action, извиквана директно от CheckoutForm.tsx (клиентски компонент) при натискане на
// "Изпрати данните". Изпълнява се на сървъра — Node.js среда, където Firebase Admin SDK и криптирането
// (crypto модула) реално работят (не могат да текат в браузъра).
//
// Сигурността тук идва ИЗЦЯЛО от проверката на токена, не от Firestore правила — Admin SDK заобикаля
// правилата напълно. Затова е критично токенът да се провери (съществува + не е изтекъл) ПРЕДИ
// какъвто и да е запис.

interface TravelerInput {
  latinName: string;
  egn: string;
  passportNumber: string;
  passportValidity: string;
}

export async function submitCheckoutData(token: string, travelers: TravelerInput[]) {
  if (!token || !Array.isArray(travelers) || travelers.length === 0) {
    return { success: false, error: 'Невалидни данни — липсва токен или списък с пътници.' };
  }

  // Валидираме, че всеки пътник има попълнени всички полета — сървърна проверка, независимо от
  // клиентската валидация в CheckoutForm.tsx (никога не се доверяваме само на клиента).
  for (const t of travelers) {
    if (!t.latinName?.trim() || !t.egn?.trim() || !t.passportNumber?.trim() || !t.passportValidity?.trim()) {
      return { success: false, error: 'Моля, попълнете всички полета за всеки пътник.' };
    }
  }

  try {
    const db = getAdminDb();
    const snap = await db.collection('inquiries').where('checkoutToken', '==', token).limit(1).get();

    if (snap.empty) {
      return { success: false, error: 'Този линк не е валиден.' };
    }

    const inquiryDoc = snap.docs[0];
    const data = inquiryDoc.data();

    if (!data.checkoutTokenExpiry || Date.now() > data.checkoutTokenExpiry) {
      return { success: false, error: 'Този линк е изтекъл. Свържете се с агенцията за нов линк.' };
    }

    if (data.checkoutCompletedAt) {
      return { success: false, error: 'Данните за тази резервация вече са изпратени.' };
    }

    // Криптираме ЕГН и номер на паспорт на ВСЕКИ пътник поотделно, преди записа — latinName и
    // passportValidity (само дата, без сама по себе си идентифицираща стойност) остават в чист текст,
    // за да могат да се показват директно в admin панела без нужда от декриптиране за прегледа.
    const encryptedTravelers = travelers.map(t => ({
      latinName: t.latinName.trim(),
      egn: encryptField(t.egn.trim()),
      passportNumber: encryptField(t.passportNumber.trim()),
      passportValidity: t.passportValidity,
    }));

    await inquiryDoc.ref.update({
      travelers: encryptedTravelers,
      checkoutCompletedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: unknown) {
    console.error('[submitCheckoutData]', error);
    const message = error instanceof Error ? error.message : 'Грешка при запис на данните.';
    return { success: false, error: message };
  }
}
