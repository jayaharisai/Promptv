import { NextResponse } from 'next/server';

const apiUrl = process.env.API_URL ?? 'http://localhost:8000';
type PromptRouteContext = { params: Promise<{ promptId: string }> };

async function forward(promptId: string, init?: RequestInit) {
  const response = await fetch(`${apiUrl}/api/v1/prompts/${promptId}`, { ...init, cache: 'no-store' });
  const body = response.status === 204 ? null : await response.json();
  return response.status === 204 ? new NextResponse(null, { status: 204 }) : NextResponse.json(body, { status: response.status });
}

export async function GET(_: Request, { params }: PromptRouteContext) { const { promptId } = await params; try { return await forward(promptId); } catch { return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 }); } }
export async function PATCH(request: Request, { params }: PromptRouteContext) { const { promptId } = await params; try { return await forward(promptId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(await request.json()) }); } catch { return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 }); } }
export async function DELETE(_: Request, { params }: PromptRouteContext) { const { promptId } = await params; try { return await forward(promptId, { method: 'DELETE' }); } catch { return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 }); } }
