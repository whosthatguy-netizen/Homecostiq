import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { makeStoryPages } from '@/lib/story'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}' -]{0,29}$/u
const formSchema = z.object({
  firstName: z.string().trim().min(1).max(30).regex(NAME_PATTERN),
  pronouns: z.enum(['he', 'she']),
  guardianConsent: z.literal('true'),
})

function validImage(bytes: Buffer, contentType: string) {
  if (contentType === 'image/jpeg') return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (contentType === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (contentType === 'image/webp') return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  return false
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to create a private storybook.' }, { status: 401 })
  const formData = await request.formData()
  const parsed = formSchema.safeParse({
    firstName: formData.get('firstName'),
    pronouns: formData.get('pronouns'),
    guardianConsent: formData.get('guardianConsent'),
  })
  const file = formData.get('photo')
  if (!parsed.success || !(file instanceof File)) {
    return NextResponse.json({ error: 'Enter a first name, choose story pronouns, confirm guardian permission, and select a photo.' }, { status: 400 })
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Choose an image smaller than 10 MB.' }, { status: 413 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  if (!validImage(bytes, file.type)) {
    return NextResponse.json({ error: 'That file does not match a supported JPEG, PNG, or WebP image.' }, { status: 415 })
  }

  const id = randomUUID()
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp'
  const photoPath = `${user.id}/${id}/original/source.${extension}`
  const { error: uploadError } = await supabase.storage
    .from('storybook-assets')
    .upload(photoPath, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: 'We could not save that photo privately. Please try again.' }, { status: 500 })

  const admin = createAdminClient()
  const { error: bookError } = await admin.from('story_books').insert({
    id,
    owner_id: user.id,
    child_first_name: parsed.data.firstName,
    pronoun_set: parsed.data.pronouns,
    photo_path: photoPath,
    guardian_consent_at: new Date().toISOString(),
    status: 'pending',
    stage: 'character',
  })

  if (bookError) {
    await admin.storage.from('storybook-assets').remove([photoPath])
    return NextResponse.json({ error: 'We could not start a new book. Please try again.' }, { status: 500 })
  }

  const pages = makeStoryPages(parsed.data.firstName, parsed.data.pronouns).map((sceneText, index) => ({
    book_id: id,
    scene_number: index + 1,
    scene_text: sceneText,
  }))
  const { error: pageError } = await admin.from('story_book_pages').insert(pages)

  if (pageError) {
    await admin.storage.from('storybook-assets').remove([photoPath])
    await admin.from('story_books').delete().eq('id', id).eq('owner_id', user.id)
    return NextResponse.json({ error: 'We could not prepare the story pages. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ id }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
}
