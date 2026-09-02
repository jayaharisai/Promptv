import { NextResponse } from 'next/server';

const apiUrl = process.env.API_URL ?? 'http://localhost:8000';
type ActiveVersionRouteContext = { params: Promise<{ promptId: string }> };

export async function PATCH(request: Request, { params }: ActiveVersionRouteContext) {
  const { promptId } = await params;
  try {
    const response = await fetch(`${apiUrl}/api/v1/prompts/${promptId}/active-version`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(await request.json()), cache: 'no-store' });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 });
  }
}
