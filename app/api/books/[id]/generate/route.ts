import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { HookConflictError } from 'workflow/errors'
import { start } from 'workflow/api'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateStoryWorkflow } from '@/workflows/generate-story'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Context) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to generate a book.' }, { status: 401 })
  const { data: book } = await supabase
    .from('story_books')
    .select('id, owner_id, stage, status, character_path, character_approved_at, progress')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!book) return NextResponse.json({ error: 'This book is not available in this session.' }, { status: 404 })

  const admin = createAdminClient()
  const body = await request.json().catch(() => null)
  const retryPortrait = typeof body === 'object' && body !== null && 'retry' in body && body.retry === true
  const phase = book.stage as 'character' | 'story'
  if (phase === 'story' && !book.character_approved_at) {
    return NextResponse.json({ error: 'Approve the character portrait before creating story illustrations.' }, { status: 409 })
  }
  if (phase === 'character' && book.status === 'pending' && !book.character_path) {
    // A new book is ready to create its first character portrait.
  } else if (phase === 'story' && book.status === 'pending' && book.character_approved_at) {
    // The guardian explicitly starts the second stage after approval.
  } else if (!['failed', 'completed'].includes(book.status)) {
    return NextResponse.json({ error: 'This generation is already running.' }, { status: 409 })
  }
  if (phase === 'story' && book.status === 'completed') {
    return NextResponse.json({ status: 'completed', message: 'This story is already complete.' })
  }
  if (phase === 'character' && book.status === 'completed' && !retryPortrait) {
    return NextResponse.json({ status: 'completed', message: 'The portrait is ready for review.' })
  }

  const { data: latestJobs } = await admin
    .from('story_generation_jobs')
    .select('id, attempt, status, workflow_run_id')
    .eq('book_id', id)
    .eq('phase', phase)
    .order('attempt', { ascending: false })
    .limit(1)
  const latest = latestJobs?.[0]

  if (latest && ['pending', 'processing', 'retrying'].includes(latest.status)) {
    return NextResponse.json({ status: latest.status, runId: latest.workflow_run_id }, { status: 202 })
  }

  const attempt = (latest?.attempt ?? 0) + 1
  if (attempt > 3) return NextResponse.json({ error: 'This stage has reached its retry limit.' }, { status: 429 })
  const jobId = randomUUID()
  const idempotencyKey = `storybook:${id}:${phase}:${attempt}`
  const { error: insertError } = await admin.from('story_generation_jobs').insert({
    id: jobId,
    book_id: id,
    owner_id: user.id,
    phase,
    attempt,
    idempotency_key: idempotencyKey,
    status: 'pending',
  })

  if (insertError) {
    const { data: duplicate } = await admin
      .from('story_generation_jobs')
      .select('id, status, workflow_run_id')
      .eq('idempotency_key', idempotencyKey)
      .eq('owner_id', user.id)
      .maybeSingle()
    if (duplicate) return NextResponse.json({ status: duplicate.status, runId: duplicate.workflow_run_id }, { status: 202 })
    return NextResponse.json({ error: 'We could not queue this generation. Please try again.' }, { status: 500 })
  }

  const { error: updateError } = await admin.from('story_books').update({
    status: 'processing',
    progress: phase === 'character' ? 8 : Math.max(book.progress, 5),
    attempts: attempt,
    error_message: null,
    workflow_run_id: null,
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('owner_id', user.id)
  if (updateError) {
    await admin.from('story_generation_jobs').update({ status: 'failed' }).eq('id', jobId)
    return NextResponse.json({ error: 'We could not prepare this generation. Please try again.' }, { status: 500 })
  }

  try {
    let runId: string
    try {
      const run = await start(generateStoryWorkflow, [id, phase, attempt, jobId], {
        experimental_hook: { token: idempotencyKey, experimental_minRetention: '30 days' },
      })
      runId = run.runId
    } catch (error) {
      if (!HookConflictError.is(error) || !error.conflictingRunId) throw error
      runId = error.conflictingRunId
    }

    await Promise.all([
      admin.from('story_generation_jobs').update({ status: 'processing', workflow_run_id: runId }).eq('id', jobId),
      admin.from('story_books').update({ workflow_run_id: runId }).eq('id', id).eq('owner_id', user.id),
    ])
    return NextResponse.json({ status: 'processing', runId }, { status: 202, headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    await Promise.all([
      admin.from('story_generation_jobs').update({ status: 'failed' }).eq('id', jobId),
      admin.from('story_books').update({ status: 'failed', error_message: 'Generation could not be queued.' }).eq('id', id).eq('owner_id', user.id),
    ])
    return NextResponse.json({ error: 'The image workflow could not start. Please retry this stage.' }, { status: 503 })
  }
}
