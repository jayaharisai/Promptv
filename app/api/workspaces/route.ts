import { NextResponse } from 'next/server';

const apiUrl = process.env.API_URL ?? 'http://localhost:8000';

async function forward(path: string, init?: RequestInit) {
  const response = await fetch(`${apiUrl}/api/v1${path}`, { ...init, cache: 'no-store' });
  const body = response.status === 204 ? null : await response.json();
  return NextResponse.json(body, { status: response.status });
}

export async function GET() {
  try {
    return await forward('/workspaces/');
  } catch {
    return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    return await forward('/workspaces/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(await request.json()),
    });
  } catch {
    return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 });
  }
}
