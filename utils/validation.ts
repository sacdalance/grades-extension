import type { SavedTerms } from "~types"

function isValidTermsObject(data: unknown): data is SavedTerms {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return false
  const entries = Object.entries(data as object)
  if (entries.length > 20) return false
  for (const [, term] of entries) {
    if (typeof term !== "object" || term === null || Array.isArray(term)) return false
    const t = term as Record<string, unknown>
    if (typeof t.term !== "string" || t.term.length > 100) return false
    if (typeof t.units !== "number") return false
    if (typeof t.gwa !== "number") return false
    if (!Array.isArray(t.subjects) || t.subjects.length > 20) return false
    for (const s of t.subjects) {
      if (typeof s !== "object" || s === null || Array.isArray(s)) return false
      const sub = s as Record<string, unknown>
      if (typeof sub.code !== "string" || sub.code.length > 100) return false
      if (typeof sub.units !== "number") return false
      if (typeof sub.grade !== "number") return false
    }
  }
  return true
}

export function parseImport(data: unknown): { terms: SavedTerms; termOrder?: string[] } | null {
  // New format: { terms: SavedTerms, termOrder: string[] }
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const d = data as Record<string, unknown>
    if (isValidTermsObject(d.terms)) {
      const termOrder = Array.isArray(d.termOrder)
        && d.termOrder.length <= 20
        && d.termOrder.every(k => typeof k === "string" && k.length <= 100)
        ? (d.termOrder as string[])
        : undefined
      return { terms: d.terms, termOrder }
    }
  }
  // Old format: flat SavedTerms object
  if (isValidTermsObject(data)) return { terms: data }
  return null
}
