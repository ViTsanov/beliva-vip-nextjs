import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get('admin_session');

  // Сървърна проверка за оторизация
  if (!adminSession || adminSession.value !== 'true') {
    redirect('/login-vip');
  }

  return <AdminDashboardClient />;
}