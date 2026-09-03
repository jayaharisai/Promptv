import { NextResponse } from 'next/server';
const apiUrl = process.env.API_URL ?? 'http://localhost:8000';
export async function GET(_: Request, { params }: { params: Promise<{ folderId: string }> }) {
  try { const { folderId } = await params; const response = await fetch(`${apiUrl}/api/v1/folders/${folderId}/token-usage`, { cache: 'no-store' }); return NextResponse.json(await response.json(), { status: response.status }); }
  catch { return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 }); }
}
