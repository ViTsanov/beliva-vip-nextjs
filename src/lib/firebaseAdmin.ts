import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

// Firebase Admin SDK за сървърни admin API route-ове, които четат директно от Firestore (заобикаля
// security rules напълно — заради това ВСЕКИ route, който го ползва, ТРЯБВА да е зад requireAdmin()).
//
// Преизползваме СЪЩИЯ service account, който вече направи за GA4 (GA4_CLIENT_EMAIL/GA4_PRIVATE_KEY) —
// само трябва да му дадеш и Firestore достъп (роля "Cloud Datastore User" в IAM), вместо да създаваш
// изцяло нов service account само за това.
//
// За Storage достъп (нужен за оптимизация на снимки сървърно) този същи service account трябва
// ДОПЪЛНИТЕЛНО да има роля "Storage Object Admin" (или по-широка) в Google Cloud IAM — иначе upload/delete
// операциите през getAdminStorage() ще гърмят с permission грешка, дори Firestore достъпът да работи.
//
// Ленива инициализация (не при import, а при първо реално извикване) — иначе ако GA4 ключовете още
// липсват, самото зареждане на файла би гръмнало с грешка, вместо изчистено "не е конфигуриран" (501).
let cachedDb: Firestore | null = null;
let cachedStorage: Storage | null = null;

function getAdminApp(): App {
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!clientEmail || !privateKey || !projectId) {
    throw new Error('Firebase Admin не е конфигуриран (липсват GA4_CLIENT_EMAIL / GA4_PRIVATE_KEY / NEXT_PUBLIC_FIREBASE_PROJECT_ID)');
  }

  return getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export function getAdminDb(): Firestore {
  if (cachedDb) return cachedDb;
  cachedDb = getFirestore(getAdminApp());
  return cachedDb;
}

// Storage достъп през Admin SDK — заобикаля CORS напълно, тъй като изтеглянето/качването се случва
// сървърно (Node.js към Node.js), не през браузърен canvas/img element. Точно затова оптимизацията на
// снимки минава оттук, не през client-side canvas подхода, който гръмна с CORS грешка от Firebase Storage.
export function getAdminStorage(): Storage {
  if (cachedStorage) return cachedStorage;
  cachedStorage = getStorage(getAdminApp());
  return cachedStorage;
}
