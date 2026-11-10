'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'sign-in' | 'sign-up'

export function AuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const supabase = createClient()

    try {
      if (mode === 'sign-up') {
        const redirectTo = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: redirectTo },
        })
        if (error) throw error
        if (data.session) {
          router.replace('/')
          router.refresh()
        } else {
          setMessage('Check your email for a confirmation link. Then return here to sign in.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        router.replace('/')
        router.refresh()
      }
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
      if (code === 'invalid_credentials' || code === 'user_not_found' || code === 'email_exists') {
        setMessage('Invalid email or password. If you just signed up, confirm your email first.')
      } else if (code === 'email_not_confirmed') {
        setMessage('Please confirm your email using the link we sent before signing in.')
      } else if (code === 'weak_password') {
        setMessage('Choose a stronger password and try again.')
      } else if (code === 'over_email_send_rate_limit' || code === 'too_many_requests') {
        setMessage('Too many attempts. Please wait a little while and try again.')
      } else {
        setMessage('We could not complete that request. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div>
        <label htmlFor="guardian-email" className="mb-2 block text-sm font-semibold">Email address</label>
        <input id="guardian-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-12 w-full rounded-xl border border-border bg-background px-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
      </div>
      <div>
        <label htmlFor="guardian-password" className="mb-2 block text-sm font-semibold">Password</label>
        <input id="guardian-password" name="password" type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full rounded-xl border border-border bg-background px-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
        <p className="mt-2 text-xs text-foreground/65">Use at least 8 characters.</p>
      </div>
      {message && <p role="status" className="rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed">{message}</p>}
      <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        {busy ? 'One moment…' : mode === 'sign-in' ? 'Sign in' : 'Create guardian account'}
      </button>
      <p className="text-center text-sm text-foreground/75">
        {mode === 'sign-in' ? 'New to StoryNuzzle?' : 'Already have an account?'}{' '}
        <button type="button" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setMessage('') }} className="font-bold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          {mode === 'sign-in' ? 'Create an account' : 'Sign in instead'}
        </button>
      </p>
    </form>
  )
}
