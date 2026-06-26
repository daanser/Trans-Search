interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

export function checkRateLimit(key: string, ip: string, limit: number, windowSec: number): void {
  const storeKey = `${key}:${ip}`
  const now = Date.now() / 1000
  let entry = store.get(storeKey)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(storeKey, entry)
  }

  entry.timestamps = entry.timestamps.filter((t) => now - t < windowSec)
  if (entry.timestamps.length >= limit) {
    throw new Error(`Rate limited, please try again in ${windowSec} seconds`)
  }
  entry.timestamps.push(now)
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("CF-Connecting-IP")
  if (forwarded) return forwarded
  const xff = request.headers.get("X-Forwarded-For")
  if (xff) return xff.split(",")[0].trim()
  return "unknown"
}
