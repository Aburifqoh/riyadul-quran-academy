import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Almuqri template: protect portal/parent with session cookie gate.
const PROTECTED_PREFIXES = ['/portal', '/parent'];
const PUBLIC_EXCEPTIONS = ['/portal/classroom'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isRscRequest =
    request.headers.get('rsc') === '1' ||
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('next-router-state-tree') !== null;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const isException = PUBLIC_EXCEPTIONS.some((exception) => pathname.startsWith(exception));
  if (isException) return NextResponse.next();

  if (isRscRequest) return NextResponse.next();

  const hasSession = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token'));

  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/portal/:path*', '/parent/:path*'],
};
