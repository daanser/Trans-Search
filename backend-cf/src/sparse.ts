import { SparseVector } from "./types"

const MD5_BITS = 20
const MD5_MOD = 1 << MD5_BITS

async function md5Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s)
  const hash = await crypto.subtle.digest("MD5", buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function textToSparse(text: string): Promise<SparseVector> {
  const tokens = new Map<number, number>()
  for (let i = 0; i < text.length; i++) {
    for (const n of [1, 2]) {
      if (i + n <= text.length) {
        const gram = text.slice(i, i + n)
        const h = parseInt(await md5Hex(gram), 16) % MD5_MOD
        tokens.set(h, (tokens.get(h) ?? 0) + (n === 1 ? 1.0 : 1.5))
      }
    }
  }
  return {
    indices: Array.from(tokens.keys()),
    values: Array.from(tokens.values()),
  }
}
