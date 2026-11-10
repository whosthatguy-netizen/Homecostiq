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
        ? 'Anonymous book sessions are not enabled for this project yet. Please enable Anonymous Sign-Ins in the project’s Supabase Auth settings.'
        : 'We could not open your book right now. Please try again.')
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
        {busy ? 'Getting your book ready…' : 'Create a book'}
      </button>
      {message && <p role="alert" className="max-w-xs text-sm leading-relaxed text-foreground/75">{message}</p>}
    </div>
  )
}
