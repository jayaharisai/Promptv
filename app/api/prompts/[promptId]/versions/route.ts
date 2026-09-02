import { NextResponse } from 'next/server';

const apiUrl = process.env.API_URL ?? 'http://localhost:8000';
type PromptVersionRouteContext = { params: Promise<{ promptId: string }> };

async function forward(promptId: string, init?: RequestInit) {
  const response = await fetch(`${apiUrl}/api/v1/prompts/${promptId}/versions`, { ...init, cache: 'no-store' });
  return NextResponse.json(await response.json(), { status: response.status });
}

export async function GET(_: Request, { params }: PromptVersionRouteContext) { const { promptId } = await params; try { return await forward(promptId); } catch { return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 }); } }
export async function POST(request: Request, { params }: PromptVersionRouteContext) { const { promptId } = await params; try { return await forward(promptId, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(await request.json()) }); } catch { return NextResponse.json({ detail: 'The API service is unavailable.' }, { status: 503 }); } }
