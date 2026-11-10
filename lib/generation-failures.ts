import { APICallError } from 'ai'

export const MAX_AUTOMATIC_GENERATION_ATTEMPTS = 3

export function shouldRetryGeneration(error: unknown, attempt: number) {
  if (APICallError.isInstance(error) && !error.isRetryable) return false
  return attempt < MAX_AUTOMATIC_GENERATION_ATTEMPTS
}
