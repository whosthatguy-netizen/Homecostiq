'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function GuestAccess() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function startGuestSession() {
    setBusy(true)
    setMessage('')

    const { data, error } = await createClient().auth.signInAnonymously()

    if (error || !data.session) {
      setMessage(error?.code === 'anonymous_provider_disabled'
        ? 'Guest access is unavailable right now. Please use guardian sign-in instead.'
        : 'We could not open a private guest session. Please try again.')
      setBusy(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        type="button"
        onClick={startGuestSession}
        disabled={busy}
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {busy ? 'Opening your book nook…' : 'Start without an account'}
      </button>
      {message && <p role="alert" className="max-w-xs text-sm leading-relaxed text-foreground/75">{message}</p>}
    </div>
  )
}
