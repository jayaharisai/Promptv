import { NextResponse } from 'next/server';

const apiUrl = process.env.API_URL ?? 'http://localhost:8000';

async function forward(path: string, init?: RequestInit) {
  const response = await fetch(`${apiUrl}/api/v1${path}`, { ...init, cache: 'no-store' });
  const body = response.status === 204 ? null : await response.json();
  return response.status === 204 ? new NextResponse(null, { status: 204 }) : NextResponse.json(body, { status: response.status });
}

type WorkspaceRouteContext = { params: Promise<{ workspaceId: string }> };

export async function PATCH(request: Request, { params }: WorkspaceRouteContext) {
  const { workspaceId } = await params;
  try {
    return await forward(`/workspaces/${workspaceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(await request.json()),
    });
  } catch {
    return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 });
  }
}

export async function DELETE(_: Request, { params }: WorkspaceRouteContext) {
  const { workspaceId } = await params;
  try {
    return await forward(`/workspaces/${workspaceId}`, { method: 'DELETE' });
  } catch {
    return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 });
  }
}
