import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const BUCKET = 'storybook-assets'

type Context = { params: Promise<{ id: string }> }

async function signedUrl(supabase: Awaited<ReturnType<typeof createClient>>, path: string | null) {
  if (!path) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60)
  return error ? null : data.signedUrl
}

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to open this book.' }, { status: 401 })

  const { data: book, error: bookError } = await supabase
    .from('story_books')
    .select('id, owner_id, child_first_name, status, stage, progress, attempts, character_approved_at, character_path, photo_path, updated_at')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (bookError || !book) return NextResponse.json({ error: 'This book is not available in this session.' }, { status: 404 })

  const { data: rows } = await supabase
    .from('story_book_pages')
    .select('scene_number, scene_text, illustration_path')
    .eq('book_id', book.id)
    .order('scene_number', { ascending: true })

  const pages = await Promise.all((rows ?? []).map(async (page) => ({
    sceneNumber: page.scene_number,
    sceneText: page.scene_text,
    illustrationPath: page.illustration_path,
    illustrationUrl: await signedUrl(supabase, page.illustration_path),
  })))

  return NextResponse.json({
    book: {
      id: book.id,
      childName: book.child_first_name,
      status: book.status,
      stage: book.stage,
      progress: book.progress,
      attempts: book.attempts,
      characterApproved: Boolean(book.character_approved_at),
      originalPhotoDeleted: !book.photo_path,
      characterPath: book.character_path,
      characterUrl: await signedUrl(supabase, book.character_path),
      updatedAt: book.updated_at,
    },
    pages,
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to delete this book.' }, { status: 401 })

  const { data: book } = await supabase
    .from('story_books')
    .select('id, owner_id, photo_path, character_path')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!book) return NextResponse.json({ error: 'This book is not available in this session.' }, { status: 404 })

  const { data: pages } = await supabase.from('story_book_pages').select('illustration_path').eq('book_id', id)
  const admin = createAdminClient()
  const characterFolder = `${user.id}/${id}/character`
  const { data: characterFiles, error: listError } = await admin.storage.from(BUCKET).list(characterFolder, { limit: 100 })
  if (listError) return NextResponse.json({ error: 'The book could not be fully deleted. Please try again.' }, { status: 500 })
  const paths = Array.from(new Set([
    book.photo_path,
    book.character_path,
    ...(pages ?? []).map((page) => page.illustration_path),
    ...(characterFiles ?? []).filter((file) => file.id).map((file) => `${characterFolder}/${file.name}`),
  ].filter((path): path is string => Boolean(path))))
  if (paths.length) {
    const { error: storageError } = await admin.storage.from(BUCKET).remove(paths)
    if (storageError) return NextResponse.json({ error: 'The book could not be fully deleted. Please try again.' }, { status: 500 })
  }

  const { error } = await admin.from('story_books').delete().eq('id', id).eq('owner_id', user.id)
  if (error) return NextResponse.json({ error: 'The book could not be deleted. Please try again.' }, { status: 500 })
  return NextResponse.json({ deleted: true }, { headers: { 'Cache-Control': 'private, no-store' } })
}
