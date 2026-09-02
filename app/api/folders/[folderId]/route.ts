import { NextResponse } from 'next/server';

const apiUrl = process.env.API_URL ?? 'http://localhost:8000';
type FolderRouteContext = { params: Promise<{ folderId: string }> };

async function forward(folderId: string, init?: RequestInit) {
  const response = await fetch(`${apiUrl}/api/v1/folders/${folderId}`, { ...init, cache: 'no-store' });
  const body = response.status === 204 ? null : await response.json();
  return response.status === 204 ? new NextResponse(null, { status: 204 }) : NextResponse.json(body, { status: response.status });
}

export async function GET(_: Request, { params }: FolderRouteContext) {
  const { folderId } = await params;
  try {
    return await forward(folderId);
  } catch {
    return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: FolderRouteContext) {
  const { folderId } = await params;
  try {
    return await forward(folderId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(await request.json()),
    });
  } catch {
    return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 });
  }
}

export async function DELETE(_: Request, { params }: FolderRouteContext) {
  const { folderId } = await params;
  try {
    return await forward(folderId, { method: 'DELETE' });
  } catch {
    return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 });
  }
}
