import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument, type PDFFont, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ id: string }> }
const BUCKET = 'storybook-assets'
const PAGE_SIZE: [number, number] = [432, 648]

async function downloadImage(admin: ReturnType<typeof createAdminClient>, storagePath: string) {
  const { data, error } = await admin.storage.from(BUCKET).download(storagePath)
  if (error || !data) throw new Error('A saved page illustration is missing.')
  return new Uint8Array(await data.arrayBuffer())
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to download this book.' }, { status: 401 })

  const { data: book } = await supabase
    .from('story_books')
    .select('id, owner_id, child_first_name, status, stage, character_approved_at, character_path')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!book) return NextResponse.json({ error: 'This book is not available in this guardian account.' }, { status: 404 })
  if (book.status !== 'completed' || book.stage !== 'story' || !book.character_approved_at || !book.character_path) {
    return NextResponse.json({ error: 'Finish the four-scene story before downloading its PDF.' }, { status: 409 })
  }

  const { data: pages } = await supabase
    .from('story_book_pages')
    .select('scene_number, scene_text, illustration_path')
    .eq('book_id', id)
    .order('scene_number', { ascending: true })
  if (!pages || pages.length !== 4 || pages.some((page) => !page.illustration_path)) {
    return NextResponse.json({ error: 'The saved book is incomplete and cannot be downloaded yet.' }, { status: 409 })
  }

  try {
    const admin = createAdminClient()
    const pdf = await PDFDocument.create()
    pdf.registerFontkit(fontkit)
    const fontPath = path.join(process.cwd(), 'node_modules', '@fontsource', 'noto-sans', 'files', 'noto-sans-latin-400-normal.woff')
    const fontBytes = await readFile(fontPath)
    const bodyFont = await pdf.embedFont(fontBytes, { subset: true })
    const ink = rgb(0.137, 0.204, 0.176)
    const green = rgb(0.157, 0.408, 0.357)
    const honey = rgb(0.882, 0.678, 0.278)

    const cover = pdf.addPage(PAGE_SIZE)
    const coverBytes = await downloadImage(admin, book.character_path)
    const coverImage = await pdf.embedPng(coverBytes)
    const coverFit = coverImage.scaleToFit(340, 370)
    cover.drawImage(coverImage, { x: (PAGE_SIZE[0] - coverFit.width) / 2, y: 180, width: coverFit.width, height: coverFit.height })
    cover.drawText('A STORYNUZZLE BOOK', { x: 36, y: 590, size: 10, font: bodyFont, color: green })
    cover.drawText(`${book.child_first_name}'s Little Book`, { x: 36, y: 112, size: 23, font: bodyFont, color: ink, maxWidth: 360 })
    cover.drawText('The Little Kitchen Helper', { x: 36, y: 77, size: 13, font: bodyFont, color: green })
    cover.drawLine({ start: { x: 36, y: 57 }, end: { x: 396, y: 57 }, thickness: 2, color: honey })

    for (const [index, page] of pages.entries()) {
      const canvas = pdf.addPage(PAGE_SIZE)
      const imageBytes = await downloadImage(admin, page.illustration_path!)
      const illustration = await pdf.embedPng(imageBytes)
      const fit = illustration.scaleToFit(360, 360)
      canvas.drawImage(illustration, { x: 36, y: 225, width: fit.width, height: fit.height })
      canvas.drawText(`${index + 1}`, { x: 36, y: 196, size: 10, font: bodyFont, color: green })
      const lines = wrapText(page.scene_text, bodyFont, 14, 360)
      lines.slice(0, 5).forEach((line, lineIndex) => {
        canvas.drawText(line, { x: 36, y: 164 - lineIndex * 22, size: 14, font: bodyFont, color: ink })
      })
      canvas.drawLine({ start: { x: 36, y: 48 }, end: { x: 396, y: 48 }, thickness: 1, color: honey })
      canvas.drawText(`${book.child_first_name}'s story`, { x: 36, y: 30, size: 9, font: bodyFont, color: green })
      canvas.drawText(`${index + 1} / 4`, { x: 365, y: 30, size: 9, font: bodyFont, color: green })
    }

    const bytes = await pdf.save()
    const safeName = book.child_first_name.toLowerCase().replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-|-$/g, '') || 'storybook'
    return new Response(bytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}-storybook.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'The PDF could not be assembled from the saved book. Please try again.' }, { status: 500 })
  }
}
