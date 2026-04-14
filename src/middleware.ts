import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// المسارات المحمية التي تحتاج تحقق إضافي
const ADMIN_ONLY_PATHS = ['/dashboard/reports', '/dashboard/profits', '/dashboard/farmers', '/dashboard/agents', '/dashboard/transporters', '/dashboard/transactions', '/dashboard/settings'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // السماح لجميع الطلبات - التحقق يتم في الـ client
  // المسارات المحمية يتم التعامل معها في صفحة dashboard

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
