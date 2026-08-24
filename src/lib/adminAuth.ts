import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Проверява дали заявката идва от автентифициран администратор.
// Сравнява стойността на бисквитката admin_session с ADMIN_SESSION_TOKEN от средата.
// Ако стойността съвпада — приема заявката; иначе връща 401.
export async function requireAdmin(): Promise<NextResponse | null> {
  const expected = process.env.ADMIN_SESSION_TOKEN;
  if (!expected) {
    // Ако токенът не е конфигуриран в средата, блокираме всичко —
    // по-добре да е счупено открито, отколкото тихо достъпно.
    console.error('[adminAuth] ADMIN_SESSION_TOKEN не е зададен в .env.local!');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');

  if (!session || session.value !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // null означава "всичко е наред, продължи"
}
