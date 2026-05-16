import type { SavedTerms } from "~types"

function isValidTermsObject(data: unknown): data is SavedTerms {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return false
  for (const [, term] of Object.entries(data as object)) {
    if (typeof term !== "object" || term === null || Array.isArray(term)) return false
    const t = term as Record<string, unknown>
    if (typeof t.term !== "string") return false
    if (typeof t.units !== "number") return false
    if (typeof t.gwa !== "number") return false
    if (!Array.isArray(t.subjects)) return false
    for (const s of t.subjects) {
      if (typeof s !== "object" || s === null || Array.isArray(s)) return false
      const sub = s as Record<string, unknown>
      if (typeof sub.code !== "string") return false
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
      const termOrder = Array.isArray(d.termOrder) && d.termOrder.every(k => typeof k === "string")
        ? (d.termOrder as string[])
        : undefined
      return { terms: d.terms, termOrder }
    }
  }
  // Old format: flat SavedTerms object
  if (isValidTermsObject(data)) return { terms: data }
  return null
}
