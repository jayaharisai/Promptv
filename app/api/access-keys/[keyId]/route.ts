import { NextResponse } from 'next/server';

const apiUrl = process.env.API_URL ?? 'http://localhost:8000';

export async function GET(_: Request, { params }: { params: Promise<{ keyId: string }> }) {
  try {
    const { keyId } = await params;
    const response = await fetch(`${apiUrl}/api/v1/access-keys/${keyId}`, { cache: 'no-store' });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ keyId: string }> }) {
  try {
    const { keyId } = await params;
    const response = await fetch(`${apiUrl}/api/v1/access-keys/${keyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(await request.json()),
      cache: 'no-store',
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ keyId: string }> }) {
  try {
    const { keyId } = await params;
    const response = await fetch(`${apiUrl}/api/v1/access-keys/${keyId}`, { method: 'DELETE', cache: 'no-store' });
    return new NextResponse(null, { status: response.status });
  } catch {
    return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 });
  }
}
