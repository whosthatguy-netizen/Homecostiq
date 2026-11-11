type RateLimitBucket = {
  startedAt: number
  count: number
}

const buckets = new Map<string, RateLimitBucket>()

function requestAddress(request: Request) {
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwardedFor || 'unknown'
}

export function isRateLimited(request: Request, scope: string, limit: number, windowMs: number) {
  const now = Date.now()
  const key = `${scope}:${requestAddress(request)}`
  const bucket = buckets.get(key)

  if (!bucket || now - bucket.startedAt >= windowMs) {
    buckets.set(key, { startedAt: now, count: 1 })
    return false
  }

  if (bucket.count >= limit) return true

  bucket.count += 1

  if (buckets.size > 5000) {
    for (const [bucketKey, value] of buckets) {
      if (now - value.startedAt >= windowMs) buckets.delete(bucketKey)
    }
  }

  return false
}
