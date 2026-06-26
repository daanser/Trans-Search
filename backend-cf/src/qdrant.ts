import { Env, QdrantCollectionInfo, QdrantScrollResult, QdrantSearchResult } from "./types"

const COLLECTION = "articles"

function headers(env: Env): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "api-key": env.QDRANT_API_KEY,
  }
}

function url(env: Env, path: string): string {
  const base = env.QDRANT_URL.replace(/\/+$/, "")
  return `${base}${path}`
}

export async function ensureCollection(env: Env): Promise<void> {
  const resp = await fetch(url(env, `/collections/${COLLECTION}`), {
    headers: headers(env),
  })
  if (resp.ok) return

  await fetch(url(env, `/collections/${COLLECTION}`), {
    method: "PUT",
    headers: headers(env),
    body: JSON.stringify({
      vectors: {
        dense: {
          size: parseInt(env.EMBED_DIM ?? "2048", 10),
          distance: "Cosine",
        },
      },
      sparse_vectors: {
        sparse: {
          modifier: "idf",
        },
      },
    }),
  })
}

export async function upsertPoints(env: Env, points: unknown[]): Promise<void> {
  const resp = await fetch(url(env, `/collections/${COLLECTION}/points`), {
    method: "PUT",
    headers: headers(env),
    body: JSON.stringify({ points }),
  })
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Qdrant upsert error ${resp.status}: ${body}`)
  }
}

export async function searchPoints(
  env: Env,
  params: {
    query: number[]
    filter?: unknown
    limit: number
    scoreThreshold?: number
  },
): Promise<QdrantSearchResult[]> {
  const body: Record<string, unknown> = {
    vector: params.query,
    limit: params.limit,
    with_payload: true,
    params: { vectors: ["dense"] },
  }
  if (params.filter) body.filter = params.filter
  if (params.scoreThreshold !== undefined) body.score_threshold = params.scoreThreshold

  const resp = await fetch(url(env, `/collections/${COLLECTION}/points/search`), {
    method: "POST",
    headers: headers(env),
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Qdrant search error ${resp.status}: ${text}`)
  }
  const data = await resp.json() as { result: QdrantSearchResult[] }
  return data.result
}

export async function queryPoints(
  env: Env,
  params: {
    prefetch?: unknown[]
    query: unknown
    using?: string
    filter?: unknown
    limit: number
    scoreThreshold?: number
  },
): Promise<QdrantSearchResult[]> {
  const body: Record<string, unknown> = {
    limit: params.limit,
    with_payload: true,
  }
  if (params.prefetch) body.prefetch = params.prefetch
  if (params.using) {
    body.query = params.query
    body.using = params.using
  } else {
    body.query = params.query
  }
  if (params.filter) body.filter = params.filter
  if (params.scoreThreshold !== undefined) body.score_threshold = params.scoreThreshold

  const resp = await fetch(url(env, `/collections/${COLLECTION}/points/query`), {
    method: "POST",
    headers: headers(env),
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Qdrant query error ${resp.status}: ${text}`)
  }
  const data = await resp.json() as { result: { points: QdrantSearchResult[] } }
  return data.result.points
}

export async function scrollPoints(
  env: Env,
  params: {
    filter?: unknown
    limit?: number
    offset?: string | number | null
  },
): Promise<QdrantScrollResult> {
  const body: Record<string, unknown> = {
    limit: params.limit ?? 100,
    with_payload: true,
    with_vectors: false,
  }
  if (params.filter) body.filter = params.filter
  if (params.offset !== undefined && params.offset !== null) body.offset = params.offset

  const resp = await fetch(url(env, `/collections/${COLLECTION}/points/scroll`), {
    method: "POST",
    headers: headers(env),
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Qdrant scroll error ${resp.status}: ${text}`)
  }
  const data = await resp.json() as { result: QdrantScrollResult }
  return data.result
}

export async function deletePoints(env: Env, filter: unknown): Promise<void> {
  const resp = await fetch(url(env, `/collections/${COLLECTION}/points/delete`), {
    method: "POST",
    headers: headers(env),
    body: JSON.stringify({ filter }),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Qdrant delete error ${resp.status}: ${text}`)
  }
}

export async function setPayload(env: Env, payload: Record<string, unknown>, points: string[]): Promise<void> {
  const resp = await fetch(url(env, `/collections/${COLLECTION}/points/payload`), {
    method: "PUT",
    headers: headers(env),
    body: JSON.stringify({ payload, points }),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Qdrant set_payload error ${resp.status}: ${text}`)
  }
}

export async function getCollectionInfo(env: Env): Promise<QdrantCollectionInfo> {
  const resp = await fetch(url(env, `/collections/${COLLECTION}`), {
    headers: headers(env),
  })
  if (!resp.ok) throw new Error(`Qdrant collection info error ${resp.status}`)
  const data = await resp.json() as { result: QdrantCollectionInfo }
  return data.result
}

export function buildFilter(
  category: string | null,
  tags: string[] | null,
  sourceSite: string | null,
  chapter: string | null,
): Record<string, unknown> | null {
  const must: Record<string, unknown>[] = []
  if (category) {
    must.push({ key: "category", match: { value: category } })
  }
  if (sourceSite) {
    must.push({ key: "source_site", match: { value: sourceSite } })
  }
  if (chapter) {
    must.push({ key: "chapter", match: { value: chapter } })
  }
  if (tags && tags.length > 0) {
    must.push({ key: "tags", match: { any: tags } })
  }
  if (must.length === 0) return null
  return { must }
}
