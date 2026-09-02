import { NextRequest, NextResponse } from 'next/server';

const sessionCookieName = 'promptv_auth';

export function middleware(request: NextRequest) {
  if (process.env.AUTH_ENABLED !== 'true') return NextResponse.next();

  const sessionKey = request.cookies.get(sessionCookieName)?.value;
  if (sessionKey === process.env.AUTH_KEY) return NextResponse.next();

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!login|api/auth/login|_next/static|_next/image|favicon.ico).*)'],
};
