import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions"; // 1. Импорт на функциите

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Инициализираме само ако вече няма инстанция (Singleton pattern)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Експортираме инстанциите
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// 2. Инициализираме и експортираме functions
// ВАЖНО: Увери се, че регионът (напр. 'us-central1') съвпада с този в Firebase Console
export const functions = getFunctions(app, "us-central1"); 

export default app;