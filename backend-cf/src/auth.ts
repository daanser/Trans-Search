import { Env } from "./types"

const ADMIN_KEY_CACHE = new Map<string, { key: string }>()

export function requireAdmin(authHeader: string | null | undefined, env: Env): void {
  if (!env.ADMIN_API_KEY) {
    throw new Error("ADMIN_API_KEY not configured")
  }
  const provided = authHeader ?? ""
  const expected = env.ADMIN_API_KEY

  const cacheKey = `${provided}:${expected}`
  const cached = ADMIN_KEY_CACHE.get(cacheKey)
  if (cached !== undefined) return

  const providedBytes = new TextEncoder().encode(provided)
  const expectedBytes = new TextEncoder().encode(expected)

  if (providedBytes.byteLength !== expectedBytes.byteLength) {
    throw new Error("Invalid admin key")
  }

  let result = 0
  for (let i = 0; i < providedBytes.byteLength; i++) {
    result |= providedBytes[i] ^ expectedBytes[i]
  }
  if (result !== 0) {
    throw new Error("Invalid admin key")
  }

  ADMIN_KEY_CACHE.set(cacheKey, { key: provided })
}
