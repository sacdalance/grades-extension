import type { Subject } from "~types"

// ─── Semester honors (per-term) ──────────────────────────────────────────────
// Source: UP System rules (University Scholar ≤ 1.45, College Scholar 1.46–1.75)
// Additional conditions (no INC grades) cannot be detected from the grades table.

export type ScholarStatus = "University Scholar" | "College Scholar" | null

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

// ─── Latin honor projection (based on remaining units) ────────────────────────
export type ProjectionStatus = "guaranteed" | "possible" | "impossible"
export type Difficulty = "easy" | "moderate" | "hard" | "extreme" | null

export interface Projection {
  tier: NonNullable<LatinHonor>
  target: number
  requiredGWA: number | null  // null when no remaining units
  status: ProjectionStatus
  difficulty: Difficulty
}

const TIERS: Array<{ tier: NonNullable<LatinHonor>; target: number }> = [
  { tier: "Summa Cum Laude", target: 1.20 },
  { tier: "Magna Cum Laude", target: 1.45 },
  { tier: "Cum Laude",       target: 1.75 },
]

export function calculateProjections(
  currentGWA: number,
  currentUnits: number,
  totalUnits: number
): Projection[] {
  const remainingUnits = Math.max(0, totalUnits - currentUnits)
  return TIERS.map(({ tier, target }) => {
    if (remainingUnits <= 0) {
      return { tier, target, requiredGWA: null, status: currentGWA <= target ? "guaranteed" : "impossible", difficulty: null }
    }
    const requiredGWA = (target * totalUnits - currentGWA * currentUnits) / remainingUnits
    
    let status: ProjectionStatus = "possible"
    let difficulty: Difficulty = null

    if (requiredGWA > 3.00) {
      status = "guaranteed"
    } else if (requiredGWA < 1.00) {
      status = "impossible"
    } else {
      status = "possible"
      // Difficulty based on required average
      if (requiredGWA >= 2.00) difficulty = "easy"
      else if (requiredGWA >= 1.50) difficulty = "moderate"
      else if (requiredGWA >= 1.25) difficulty = "hard"
      else difficulty = "extreme"
    }

    return { tier, target, requiredGWA, status, difficulty }
  })
}

/**
 * Calculates the final GWA if the student gets a specific average for all remaining units.
 */
export function estimateFinalGWA(
  currentGWA: number,
  currentUnits: number,
  totalUnits: number,
  futureAvg: number
): number {
  const remainingUnits = Math.max(0, totalUnits - currentUnits)
  if (totalUnits <= 0) return currentGWA
  return (currentGWA * currentUnits + futureAvg * remainingUnits) / totalUnits
}
