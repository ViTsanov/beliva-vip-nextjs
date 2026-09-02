import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get('admin_session');

  // Сървърна проверка за оторизация — сравняваме срещу реалната тайна стойност (ADMIN_SESSION_TOKEN),
  // не срещу хардкодната низа 'true' — така беше преди: createSession() в actions/auth.ts записва cookie-то
  // със реалния тайнен токен, но тук се сравняваше срещу 'true' — никога не съвпадаше, винаги
  // редиректваше обратно към login, дори след успешен login.
  // ВАЖНО: ADMIN_SESSION_TOKEN трябва да е зададен и в Firebase App Hosting environment конфигурацията (не само
  // локално в .env.local, който обикновено не се качва в git) — иначе същият проблем ще се повтори в продукция.
  if (!adminSession || adminSession.value !== process.env.ADMIN_SESSION_TOKEN) {
    redirect('/login-vip');
  }

  return <AdminDashboardClient />;
}