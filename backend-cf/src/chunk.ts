export function sanitizeQuery(q: string, maxLen: number): string {
  q = q.replace(/[\x00-\x1f\x7f]/g, "").trim()
  if (!q) throw new Error("Search query cannot be empty")
  if (q.length > maxLen) throw new Error(`Search query too long, max ${maxLen} characters`)
  return q
}

export function splitChunks(text: string, size: number, overlap: number): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  const chunks: string[] = []
  let current = ""

  for (const para of paragraphs) {
    if (current.length + para.length + 2 <= size) {
      current += (current ? "\n\n" : "") + para
    } else {
      if (current) chunks.push(current)
      if (para.length > size) {
        for (let i = 0; i < para.length; i += size - overlap) {
          const part = para.slice(i, i + size)
          if (part.trim()) chunks.push(part)
        }
        current = ""
      } else {
        current = para
      }
    }
  }
  if (current) chunks.push(current)
  return chunks.filter((c) => c.trim().length > 0)
}

export function buildContextPrefix(article: {
  source_site?: string | null
  category?: string | null
  chapter?: string | null
  title: string
}): string {
  const parts: string[] = []
  if (article.source_site) parts.push(`来源：${article.source_site}`)
  if (article.category) parts.push(`分类：${article.category}`)
  if (article.chapter) parts.push(`章节：${article.chapter}`)
  parts.push(`标题：${article.title}`)
  return parts.join("\n")
}

export function parseTagList(tags: string | null): string[] | null {
  if (!tags) return null
  return tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10)
}
