import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const activeWorkspaceCookie = 'promptv_active_workspace';

export async function GET() {
  const cookieStore = await cookies();
  return NextResponse.json({ workspaceId: cookieStore.get(activeWorkspaceCookie)?.value ?? null });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { workspaceId?: unknown } | null;
  if (typeof body?.workspaceId !== 'string' || !body.workspaceId.trim()) {
    return NextResponse.json({ detail: 'workspaceId is required.' }, { status: 400 });
  }

  const response = NextResponse.json({ workspaceId: body.workspaceId });
  response.cookies.set(activeWorkspaceCookie, body.workspaceId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
