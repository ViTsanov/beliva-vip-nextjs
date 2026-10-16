'use server';

import { getAdminDb, getAdminStorage } from '@/lib/firebaseAdmin';
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
  // Път до КРИПТИРАНАТА снимка в Storage (качена преди това през /api/checkout/upload-passport). По избор.
  passportPhoto?: string;
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

    // Формата е отворена за попълване, ако още не е изпратена ИЛИ админът е поискал корекция (checkoutReopened).
    const isCorrection = !!data.checkoutCompletedAt;
    if (isCorrection && !data.checkoutReopened) {
      return { success: false, error: 'Данните за тази резервация вече са изпратени.' };
    }

    // Снимката трябва да е качена за ТОВА запитване — иначе клиент би могъл да подмени път към чужд файл.
    const photoPrefix = `passport-scans/${inquiryDoc.id}/`;
    for (const t of travelers) {
      if (t.passportPhoto && !(t.passportPhoto.startsWith(photoPrefix) && /^[A-Za-z0-9/_.-]+$/.test(t.passportPhoto) && !t.passportPhoto.includes('..'))) {
        return { success: false, error: 'Невалидна снимка. Качете я отново.' };
      }
    }

    // Криптираме ЕГН и номер на паспорт на ВСЕКИ пътник поотделно, преди записа — latinName и
    // passportValidity (само дата, без сама по себе си идентифицираща стойност) остават в чист текст,
    // за да могат да се показват директно в admin панела без нужда от декриптиране за прегледа.
    const encryptedTravelers = travelers.map(t => ({
      latinName: t.latinName.trim(),
      egn: encryptField(t.egn.trim()),
      passportNumber: encryptField(t.passportNumber.trim()),
      passportValidity: t.passportValidity,
      passportPhoto: t.passportPhoto || '',
    }));

    await inquiryDoc.ref.update({
      travelers: encryptedTravelers,
      checkoutCompletedAt: FieldValue.serverTimestamp(),
      // Корекцията е приключила — линкът пак се затваря. Запитването си остава в „Резервации“.
      checkoutReopened: false,
      ...(isCorrection ? { checkoutRevisions: FieldValue.increment(1), lastCorrectionAt: FieldValue.serverTimestamp() } : {}),
    });

    // Старите снимки, които вече не се ползват (заменени или премахнати пътници), се изтриват — да не стоят
    // паспортни данни повече от нужното. Неуспешно изтриване не е причина да откажем коректно изпратените данни.
    if (isCorrection && Array.isArray(data.travelers)) {
      const kept = new Set(travelers.map(t => t.passportPhoto).filter(Boolean));
      const orphans: string[] = data.travelers.map((t: any) => t?.passportPhoto).filter((p: any) => typeof p === 'string' && p && !kept.has(p));
      await Promise.all(orphans.map(path =>
        getAdminStorage().bucket().file(path).delete({ ignoreNotFound: true }).catch((e: unknown) => console.error('[checkout] delete old passport photo', e))
      ));
    }

    return { success: true, corrected: isCorrection };
  } catch (error: unknown) {
    console.error('[submitCheckoutData]', error);
    const message = error instanceof Error ? error.message : 'Грешка при запис на данните.';
    return { success: false, error: message };
  }
}
