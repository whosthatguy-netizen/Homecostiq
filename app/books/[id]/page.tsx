import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookProject } from '@/components/storynuzzle/book-project'
import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ id: string }> }

export default async function BookPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: book } = await supabase
    .from('story_books')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!book) {
    return <main className="min-h-screen px-5 py-16 text-center"><h1 className="font-serif text-4xl">That book isn&apos;t on this shelf</h1><p className="mt-3 text-foreground/70">Books can only be opened by the guardian account that created them.</p><Link href="/" className="mt-6 inline-block font-semibold text-primary underline underline-offset-4">Return to your shelf</Link></main>
  }

  return <BookProject bookId={book.id} />
}
