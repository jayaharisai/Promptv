import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

const sessionCookieName = 'promptv_auth';

function matchesAuthKey(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  if (process.env.AUTH_ENABLED !== 'true') return NextResponse.json({ ok: true });

  const body = await request.json().catch(() => null) as { key?: unknown } | null;
  const submittedKey = typeof body?.key === 'string' ? body.key : '';
  const expectedKey = process.env.AUTH_KEY ?? '';

  if (!expectedKey || !matchesAuthKey(submittedKey, expectedKey)) {
    return NextResponse.json({ message: 'That authentication key is not valid.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, expectedKey, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
