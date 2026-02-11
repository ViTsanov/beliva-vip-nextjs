'use server'

import { cookies } from 'next/headers';

export async function createSession() {
  const cookieStore = await cookies(); // Добавено await
  cookieStore.set('admin_session', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // 24 часа
    path: '/',
    sameSite: 'strict'
  });
}

// Промених името на logoutAction, за да съвпада с импорта в DashboardClient
export async function logoutAction() {
  const cookieStore = await cookies(); // Добавено await
  cookieStore.delete('admin_session');
}

export async function removeSession() {
  const cookieStore = await cookies(); // Добавено await
  cookieStore.delete('admin_session');
}