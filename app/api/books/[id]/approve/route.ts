import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Context) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to approve this character.' }, { status: 401 })

  const { data: book } = await supabase
    .from('story_books')
    .select('id, owner_id, stage, status, photo_path, character_path, character_approved_at')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!book) return NextResponse.json({ error: 'This book is not available in this session.' }, { status: 404 })
  if (book.stage !== 'character' || book.status !== 'completed' || !book.character_path) {
    return NextResponse.json({ error: 'A completed character portrait is required before approval.' }, { status: 409 })
  }

  const admin = createAdminClient()
  if (book.photo_path) {
    const { error: photoError } = await admin.storage.from('storybook-assets').remove([book.photo_path])
    if (photoError) return NextResponse.json({ error: 'The original photo could not be removed. Please try again.' }, { status: 500 })
  }

  const { error } = await admin.from('story_books').update({
    photo_path: '',
    character_approved_at: book.character_approved_at ?? new Date().toISOString(),
    stage: 'story',
    status: 'pending',
    progress: 0,
    workflow_run_id: null,
    error_message: null,
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('owner_id', user.id)
  if (error) return NextResponse.json({ error: 'We could not save the approval. Please try again.' }, { status: 500 })

  return NextResponse.json({ approved: true, originalPhotoDeleted: true }, { headers: { 'Cache-Control': 'private, no-store' } })
}
