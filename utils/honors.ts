import type { Subject } from "~types"

// ─── Semester honors (per-term) ──────────────────────────────────────────────
// Source: UP System rules (University Scholar ≤ 1.45, College Scholar 1.46–1.75, Academic Achiever 1.76–2.00)
// Additional conditions (no INC grades) cannot be detected from the grades table.

export type ScholarStatus = "University Scholar" | "College Scholar" | "Academic Achiever" | null

export function getScholarStatus(
  gwa: number,
  units: number,
  subjects: Subject[]
): { status: ScholarStatus; disqualified: boolean; reason?: string } {
  if (units < 15) {
    return { status: null, disqualified: false, reason: "Need ≥ 15 units" }
  }
  // In UP's 1–5 scale, numerically higher = worse. "No grade below 3.00"
  // means no grade worse than 3.00, i.e., no grade > 3.00.
  const hasLowGrade = subjects.some((s) => s.grade > 3.0)
  if (hasLowGrade) {
    return { status: null, disqualified: true, reason: "Grade below 3.00 found" }
  }
  if (gwa > 0 && gwa <= 1.45) return { status: "University Scholar", disqualified: false }
  if (gwa > 0 && gwa <= 1.75) return { status: "College Scholar", disqualified: false }
  if (gwa > 0 && gwa <= 2.00) return { status: "Academic Achiever", disqualified: false }
  return { status: null, disqualified: false }
}

// ─── Latin honors (cumulative, at graduation) ─────────────────────────────────
export type LatinHonor = "Summa Cum Laude" | "Magna Cum Laude" | "Cum Laude" | null

export function getLatinHonor(cumulativeGwa: number): LatinHonor {
  if (cumulativeGwa <= 0) return null
  if (cumulativeGwa <= 1.2) return "Summa Cum Laude"
  if (cumulativeGwa <= 1.45) return "Magna Cum Laude"
  if (cumulativeGwa <= 1.75) return "Cum Laude"
  return null
}

// ─── Display labels (always "Qualified for …" to indicate unofficial estimate) ─
export function displayScholar(status: ScholarStatus): string {
  return status ? `GWA Eligible for ${status}` : ""
}

export function displayLatin(honor: LatinHonor): string {
  return honor ? `On Track for ${honor}` : ""
}
