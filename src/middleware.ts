// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const adminSession = request.cookies.get('admin_session')
  const isLoginPage = request.nextUrl.pathname === '/login-vip'
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin-beliva-2025')

  if (isAdminPage && !adminSession) {
    return NextResponse.redirect(new URL('/login-vip', request.url))
  }

  if (isLoginPage && adminSession) {
    return NextResponse.redirect(new URL('/admin-beliva-2025', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin-beliva-2025/:path*', '/login-vip'],
}