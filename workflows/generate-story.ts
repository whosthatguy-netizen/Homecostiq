import OpenAI from 'openai'
import { toFile } from 'openai/uploads'
import { createHash } from 'node:crypto'
import { FatalError, RetryableError, getStepMetadata } from 'workflow'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PronounSet } from '@/lib/story'

const BUCKET = 'storybook-assets'
const MODEL = 'gpt-image-2.6-sunburst'
const MAX_AUTOMATIC_ATTEMPTS = 3

type Phase = 'character' | 'story'
type BookRow = {
  id: string
  owner_id: string
  child_first_name: string
  pronoun_set: PronounSet
  photo_path: string
  character_path: string | null
}

function openAiClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new FatalError('Live image generation is not configured.')
  return new OpenAI({ apiKey, maxRetries: 0, timeout: 180_000 })
}

async function imageEdit(source: Uint8Array, sourceName: string, contentType: string, prompt: string, safetyIdentifier: string) {
  const file = await toFile(source, sourceName, { type: contentType })
  const result = await openAiClient().images.edit({
    model: MODEL,
    image: file,
    prompt,
    size: '1024x1024',
    quality: 'high',
    complexity: 'medium',
    output_format: 'png',
    background: 'opaque',
    safety_identifier: safetyIdentifier,
  })
  const encoded = result.data?.[0]?.b64_json
  if (!encoded) throw new Error('The image service returned no illustration.')
  return Buffer.from(encoded, 'base64')
}

async function updateFailureState(bookId: string, jobId: string, final: boolean) {
  const status = final ? 'failed' : 'retrying'
  const admin = createAdminClient()
  const updates = await Promise.all([
    admin.from('story_generation_jobs').update({ status }).eq('id', jobId),
    admin.from('story_books').update({
      status,
      error_message: final ? 'This step could not finish. Please retry when ready.' : null,
      updated_at: new Date().toISOString(),
    }).eq('id', bookId),
  ])
  if (updates.some((update) => update.error)) throw new Error('Could not record the generation status.')
}

async function recordStepFailure(bookId: string, jobId: string, error: unknown): Promise<never> {
  const metadata = getStepMetadata()
  const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : null
  const permanentClientError = Boolean(status && status >= 400 && status < 500 && status !== 429)
  const final = permanentClientError || metadata.attempt >= MAX_AUTOMATIC_ATTEMPTS
  await updateFailureState(bookId, jobId, final)

  if (permanentClientError) throw new FatalError('The image service rejected this request.')
  if (!final) {
    const delay = Math.min(30_000, metadata.attempt * 5_000)
    throw new RetryableError('Image generation will retry.', { retryAfter: delay })
  }
  throw error instanceof Error ? error : new Error('Image generation failed.')
}

async function loadBook(bookId: string): Promise<BookRow> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('story_books')
    .select('id, owner_id, child_first_name, pronoun_set, photo_path, character_path')
    .eq('id', bookId)
    .maybeSingle()
  if (error || !data) throw new FatalError('The book is no longer available.')
  return data as BookRow
}

async function storeImage(path: string, bytes: Buffer) {
  const admin = createAdminClient()
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: 'image/png',
    upsert: true,
  })
  if (error) throw new Error('The private illustration could not be saved.')
}

export async function generateStoryWorkflow(bookId: string, phase: Phase, attempt: number, jobId: string) {
  'use workflow'

  try {
    if (phase === 'character') {
      await createCharacter(bookId, jobId)
      return { status: 'character_ready' }
    }

    const book = await loadBookStep(bookId)
    if (!book.character_path) throw new FatalError('Approve a character portrait before creating story scenes.')
    for (let sceneNumber = 1; sceneNumber <= 4; sceneNumber += 1) {
      await createScene(bookId, sceneNumber, jobId)
    }
    await completeStory(bookId, jobId)
    return { status: 'story_ready' }
  } catch (error) {
    await markWorkflowFailed(bookId, jobId)
    throw error
  }
}

async function createCharacter(bookId: string, jobId: string) {
  'use step'

  const book = await loadBook(bookId)
  const admin = createAdminClient()
  const { data: photo, error: photoError } = await admin.storage.from(BUCKET).download(book.photo_path)
  if (photoError || !photo) throw new FatalError('The original photo is no longer available.')
  const mime = book.photo_path.endsWith('.png') ? 'image/png' : book.photo_path.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
  const extension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
  const safetyIdentifier = createHash('sha256').update(book.owner_id).digest('hex')
  let image: Buffer

  try {
    image = await imageEdit(
      new Uint8Array(await photo.arrayBuffer()),
      `reference.${extension}`,
      mime,
      `Create one polished children's picture-book character portrait based on the child in the provided reference photo. Preserve their recognizable facial features, skin tone, hair, and age-appropriate appearance while rendering them as a gentle hand-painted gouache and colored-pencil illustration. Show a friendly, natural expression, a simple yellow apron with a small red star, and a clean warm-white background. Keep the child fully clothed and the only person in the portrait. No words, lettering, logos, extra limbs, or watermark. This is a portrait illustration, not a photo.`,
      safetyIdentifier,
    )
  } catch (error) {
    return recordStepFailure(bookId, jobId, error)
  }

  const path = `${book.owner_id}/${book.id}/character/approved.png`
  await storeImage(path, image)
  const updates = await Promise.all([
    admin.from('story_books').update({
      character_path: path,
      status: 'completed',
      progress: 100,
      workflow_run_id: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    }).eq('id', book.id),
    admin.from('story_generation_jobs').update({ status: 'completed' }).eq('id', jobId),
  ])
  if (updates.some((update) => update.error)) throw new Error('The character portrait could not be saved to the book.')
}

async function createScene(bookId: string, sceneNumber: number, jobId: string) {
  'use step'

  const admin = createAdminClient()
  const book = await loadBook(bookId)
  const { data: existingPage, error: pageError } = await admin
    .from('story_book_pages')
    .select('scene_text, illustration_path')
    .eq('book_id', bookId)
    .eq('scene_number', sceneNumber)
    .maybeSingle()
  if (pageError || !existingPage) throw new FatalError('A saved story page is missing.')
  if (existingPage.illustration_path) return
  if (!book.character_path) throw new FatalError('The approved character portrait is missing.')

  const { data: reference, error: referenceError } = await admin.storage.from(BUCKET).download(book.character_path)
  if (referenceError || !reference) throw new FatalError('The approved character portrait is unavailable.')

  const safetyIdentifier = createHash('sha256').update(book.owner_id).digest('hex')
  let image: Buffer
  try {
    image = await imageEdit(
      new Uint8Array(await reference.arrayBuffer()),
      'approved-character.png',
      'image/png',
      `Create scene ${sceneNumber} of 4 in the same children's picture book. Use the supplied approved character portrait as the strict visual identity and art-style reference: keep the child's recognizable face, skin tone, hair, yellow apron with the small red star, proportions, and hand-painted gouache and colored-pencil style consistent. Illustrate this exact story beat: ${existingPage.scene_text} Setting: a bright cozy family kitchen, apples and safe baking ingredients, gentle daylight, joyful and calm mood. Keep the child fully clothed. Make a square story illustration with clear composition. Do not include any text, letters, signs, logos, extra limbs, or watermark.`,
      safetyIdentifier,
    )
  } catch (error) {
    return recordStepFailure(bookId, jobId, error)
  }

  const path = `${book.owner_id}/${book.id}/pages/${sceneNumber}.png`
  await storeImage(path, image)
  const { error: saveError } = await admin.from('story_book_pages').update({ illustration_path: path }).eq('book_id', bookId).eq('scene_number', sceneNumber)
  if (saveError) throw new Error('The story illustration could not be attached to its page.')
  const { error: progressError } = await admin.from('story_books').update({
    status: 'processing',
    progress: Math.min(95, 10 + sceneNumber * 21),
    updated_at: new Date().toISOString(),
  }).eq('id', bookId)
  if (progressError) throw new Error('The story progress could not be saved.')
}

async function completeStory(bookId: string, jobId: string) {
  'use step'
  const admin = createAdminClient()
  const updates = await Promise.all([
    admin.from('story_books').update({ status: 'completed', progress: 100, workflow_run_id: null, error_message: null, updated_at: new Date().toISOString() }).eq('id', bookId),
    admin.from('story_generation_jobs').update({ status: 'completed' }).eq('id', jobId),
  ])
  if (updates.some((update) => update.error)) throw new Error('The book could not be marked complete.')
}

async function markWorkflowFailed(bookId: string, jobId: string) {
  'use step'
  const admin = createAdminClient()
  await Promise.all([
    admin.from('story_books').update({ status: 'failed', error_message: 'This step could not finish. Please retry when ready.', updated_at: new Date().toISOString() }).eq('id', bookId),
    admin.from('story_generation_jobs').update({ status: 'failed' }).eq('id', jobId),
  ])
}

async function loadBookStep(bookId: string) {
  'use step'
  return loadBook(bookId)
}
