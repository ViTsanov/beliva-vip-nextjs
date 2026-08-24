// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function isValidSession(request: NextRequest): boolean {
  const token = process.env.ADMIN_SESSION_TOKEN;
  const cookie = request.cookies.get('admin_session');
  // Ако токенът не е конфигуриран — блокираме достъпа вместо да го разрешим
  if (!token) return false;
  return cookie?.value === token;
}

export function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === '/login-vip'
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin-beliva-2025')
  const authenticated = isValidSession(request);

  if (isAdminPage && !authenticated) {
    return NextResponse.redirect(new URL('/login-vip', request.url))
  }

  if (isLoginPage && authenticated) {
    return NextResponse.redirect(new URL('/admin-beliva-2025', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin-beliva-2025/:path*', '/login-vip'],
}