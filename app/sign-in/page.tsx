import Link from 'next/link'
import { AuthForm } from '@/components/storynuzzle/auth-form'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SignInPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/')

  return (
    <main className="min-h-screen px-5 py-10 sm:px-8">
      <Link href="/" className="mx-auto flex w-fit items-center gap-3 font-serif text-2xl font-semibold">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground" aria-hidden="true"><BookMark /></span>
        StoryNuzzle
      </Link>
      <section className="mx-auto mt-10 max-w-xl rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:mt-16 sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Guardian account</p>
        <h1 className="mt-3 font-serif text-4xl">Welcome to your book nook</h1>
        <p className="mt-3 leading-relaxed text-foreground/75">Sign in to keep your child&apos;s photo and story private, or create a new account to begin.</p>
        <AuthForm />
      </section>
      <p className="mx-auto mt-6 max-w-xl text-center text-sm leading-relaxed text-foreground/70">Only the signed-in guardian can view, download, or delete their family&apos;s books.</p>
    </main>
  )
}

function BookMark() {
  return <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true"><path d="M12 6.5c-2.2-1.7-5-2-8-1.1v13c3-.9 5.8-.6 8 1.1m0-13c2.2-1.7 5-2 8-1.1v13c-3-.9-5.8-.6-8 1.1m0-13v13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
