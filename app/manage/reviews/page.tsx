import type { Metadata } from 'next'
import { ReviewModeration } from '@/components/quirkello/review-moderation'

export const metadata: Metadata = {
  title: 'Review moderation',
  robots: { index: false, follow: false },
}

export default function ReviewModerationPage() {
  return <ReviewModeration />
}
