import { Config } from "./config"
import { Env } from "./types"

export interface RerankResult {
  index: number
  relevance_score: number
}

export async function rerank(
  query: string,
  documents: string[],
  env: Env,
  cfg: Config,
): Promise<RerankResult[]> {
  if (!cfg.rerank_enabled) {
    return documents.map((_, i) => ({ index: i, relevance_score: 1 }))
  }

  const baseUrl = cfg.reranker_base_url.replace(/\/+$/, "") + "/"
  const apiKey = env.RERANKER_API_KEY || env.OPENAI_API_KEY
  const model = cfg.rerank_model

  const url = `${baseUrl}rerank`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const resp = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        query: query.slice(0, 200),
        documents: documents.map((d) => d.slice(0, 2000)),
      }),
    })
    if (!resp.ok) {
      const body = await resp.text()
      throw new Error(`Rerank API error ${resp.status}: ${body}`)
    }
    const data = (await resp.json()) as { results: RerankResult[] }
    return data.results
  } finally {
    clearTimeout(timeout)
  }
}
