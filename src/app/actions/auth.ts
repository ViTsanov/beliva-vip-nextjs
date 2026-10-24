'use server'

import { cookies } from 'next/headers';

const ADMIN_UI_COOKIE = 'admin_ui';

export async function createSession() {
  const cookieStore = await cookies(); // Добавено await
  cookieStore.set('admin_session', process.env.ADMIN_SESSION_TOKEN ?? 'MISSING_TOKEN', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // 24 часа
    path: '/',
    sameSite: 'strict'
  });
  // Видим за браузъра знак „влязъл е админ“ — само за бутона „Админ“ в менюто (Navbar.tsx), без да се зарежда
  // Firebase Auth на публичните страници. Не дава достъп до нищо: защитата е admin_session (httpOnly) по-горе.
  cookieStore.set(ADMIN_UI_COOKIE, '1', {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24,
    path: '/',
    sameSite: 'strict'
  });
}

// Промених името на logoutAction, за да съвпада с импорта в DashboardClient
export async function logoutAction() {
  const cookieStore = await cookies(); // Добавено await
  cookieStore.delete('admin_session');
  cookieStore.delete(ADMIN_UI_COOKIE);
}

export async function removeSession() {
  const cookieStore = await cookies(); // Добавено await
  cookieStore.delete('admin_session');
  cookieStore.delete(ADMIN_UI_COOKIE);
}