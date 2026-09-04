import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

// Firebase Admin SDK за сървърни admin API route-ове, които четат директно от Firestore (заобикаля
// security rules напълно — заради това ВСЕКИ route, който го ползва, ТРЯБВА да е зад requireAdmin()).
//
// Преизползваме СЪЩИЯ service account, който вече направи за GA4 (GA4_CLIENT_EMAIL/GA4_PRIVATE_KEY) —
// само трябва да му дадеш и Firestore достъп (роля "Cloud Datastore User" в IAM), вместо да създаваш
// изцяло нов service account само за това.
//
// Ленива инициализация (не при import, а при първо реално извикване) — иначе ако GA4 ключовете още
// липсват, самото зареждане на файла би гръмнало с грешка, вместо изчистено "не е конфигурирано" (501).
let cachedDb: Firestore | null = null;

export function getAdminDb(): Firestore {
  if (cachedDb) return cachedDb;

  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!clientEmail || !privateKey || !projectId) {
    throw new Error('Firebase Admin не е конфигуриран (липсват GA4_CLIENT_EMAIL / GA4_PRIVATE_KEY / NEXT_PUBLIC_FIREBASE_PROJECT_ID)');
  }

  const app: App = getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  cachedDb = getFirestore(app);
  return cachedDb;
}
