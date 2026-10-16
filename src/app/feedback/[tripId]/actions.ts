'use server';

import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

// Записва отзив от личния линк /feedback/{token}. Изпълнява се на сървъра (Admin SDK), защото клиентът
// няма логин, а правилата на Firestore позволяват писане в reviews/customers/groups само на админ.
// Достъпът се пази от токена (reviewRequests/{token}): съществува, не е използван и не е изтекъл.

const isExpired = (expiresAt?: number) => !!expiresAt && Date.now() > expiresAt;

export async function submitReview(token: string, input: { rating: number; comment: string; consent: boolean }) {
  const rating = Math.round(Number(input?.rating));
  const comment = String(input?.comment || '').trim().slice(0, 3000);
  const consent = input?.consent === true;

  if (!/^[A-Za-z0-9-]{20,64}$/.test(token || '')) return { success: false, error: 'Този линк не е валиден.' };
  if (!(rating >= 1 && rating <= 5)) return { success: false, error: 'Моля, изберете оценка от 1 до 5 звезди.' };

  try {
    const db = getAdminDb();
    const reqRef = db.collection('reviewRequests').doc(token);

    const result = await db.runTransaction(async (tx) => {
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists) return { success: false, error: 'Този линк не е валиден.' };
      const r = reqSnap.data() as any;
      if (r.status === 'completed') return { success: false, error: 'Вече сте изпратили отзив. Благодарим Ви!' };
      if (isExpired(r.expiresAt)) return { success: false, error: 'Линкът е изтекъл. Свържете се с нас, ако искате да споделите мнение.' };

      // Всички четения — преди записите (изискване на Firestore транзакциите).
      const groupRef = r.groupId ? db.collection('groups').doc(r.groupId) : null;
      const customerRef = r.customerId ? db.collection('customers').doc(r.customerId) : null;
      const groupSnap = groupRef ? await tx.get(groupRef) : null;
      const customerSnap = customerRef ? await tx.get(customerRef) : null;

      const reviewRef = db.collection('reviews').doc();
      tx.set(reviewRef, {
        tourId: r.tourId || '',
        tourTitle: r.tourTitle || '',
        tourDate: r.tourDate || '',
        tourOperator: r.tourOperator || 'Неизвестен',
        customerName: r.customerName || '',
        customerId: r.customerId || '',
        groupId: r.groupId || '',
        rating,
        comment,
        consentToPublish: consent,
        isPublished: false, // админът решава дали да го публикува
        source: 'form',
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.update(reqRef, { status: 'completed', completedAt: FieldValue.serverTimestamp(), reviewId: reviewRef.id });

      // Отбелязваме отзива при туриста в групата — оттам се изпраща към туроператора.
      if (groupRef && groupSnap?.exists) {
        const tourists: any[] = Array.isArray(groupSnap.data()?.tourists) ? [...groupSnap.data()!.tourists] : [];
        let idx = tourists.findIndex(t => t?.reviewToken === token);
        if (idx < 0 && tourists[r.touristIndex]?.customerId === r.customerId) idx = r.touristIndex;
        if (idx >= 0) {
          tourists[idx] = {
            ...tourists[idx],
            reviewReceived: true,
            reviewSource: 'form',
            reviewText: comment,
            reviewRating: rating,
            reviewReceivedAt: new Date().toISOString(),
          };
          tx.update(groupRef, { tourists });
        }
      }

      // И в историята на клиента — пътуването получава статус „отзив получен“.
      if (customerRef && customerSnap?.exists) {
        const history: any[] = Array.isArray(customerSnap.data()?.tripHistory) ? customerSnap.data()!.tripHistory : [];
        let changed = false;
        const updated = history.map(trip => {
          if (trip?.tourId === r.tourId && trip?.date === r.tourDate) {
            changed = true;
            return { ...trip, feedbackStatus: 'completed' };
          }
          return trip;
        });
        if (changed) tx.update(customerRef, { tripHistory: updated });
      }

      return { success: true };
    });

    return result;
  } catch (error: unknown) {
    console.error('[submitReview]', error);
    return { success: false, error: 'Възникна грешка. Моля, опитайте отново.' };
  }
}
