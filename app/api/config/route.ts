import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const ready = Boolean(process.env.OPENAI_API_KEY)
  return NextResponse.json(
    { ready, mode: ready ? 'live' : 'unavailable', model: 'GPT Image 2.6 Sunburst' },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
