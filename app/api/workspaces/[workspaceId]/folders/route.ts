import { NextResponse } from 'next/server';

const apiUrl = process.env.API_URL ?? 'http://localhost:8000';
type WorkspaceFolderRouteContext = { params: Promise<{ workspaceId: string }> };

async function forward(workspaceId: string, init?: RequestInit) {
  const response = await fetch(`${apiUrl}/api/v1/workspaces/${workspaceId}/folders`, { ...init, cache: 'no-store' });
  const body = await response.json();
  return NextResponse.json(body, { status: response.status });
}

export async function GET(_: Request, { params }: WorkspaceFolderRouteContext) {
  const { workspaceId } = await params;
  try {
    return await forward(workspaceId);
  } catch {
    return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: WorkspaceFolderRouteContext) {
  const { workspaceId } = await params;
  try {
    return await forward(workspaceId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(await request.json()),
    });
  } catch {
    return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 });
  }
}
