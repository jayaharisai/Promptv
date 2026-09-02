import { NextResponse } from 'next/server';

const apiUrl = process.env.API_URL ?? 'http://localhost:8000';
type FolderPromptRouteContext = { params: Promise<{ folderId: string }> };

async function forward(folderId: string, init?: RequestInit) {
  const response = await fetch(`${apiUrl}/api/v1/folders/${folderId}/prompts`, { ...init, cache: 'no-store' });
  return NextResponse.json(await response.json(), { status: response.status });
}

export async function GET(_: Request, { params }: FolderPromptRouteContext) {
  const { folderId } = await params;
  try { return await forward(folderId); } catch { return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 }); }
}

export async function POST(request: Request, { params }: FolderPromptRouteContext) {
  const { folderId } = await params;
  try { return await forward(folderId, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(await request.json()) }); } catch { return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 }); }
}
