import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isAdminPage = path.startsWith('/admin');
  const isLoginPage = path === '/admin/login';

  // চেক করা হচ্ছে ইউজার লগইন কুকি আছে কি না
  const hasAuthCookie = request.cookies.getAll().some(cookie => cookie.name.includes('auth-token'));

  // যদি অ্যাডমিন পেজে যায়, লগইন না থাকে এবং লগইন পেজ না হয়, তবে তাকে লগইনে পাঠিয়ে দেবে
  if (isAdminPage && !isLoginPage && !hasAuthCookie) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};