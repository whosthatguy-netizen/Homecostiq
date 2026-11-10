import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(
    { ready: true, mode: 'live', model: 'OpenAI GPT Image 2.6 Sunburst via Vercel AI Gateway' },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
