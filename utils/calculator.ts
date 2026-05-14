import type { Subject, Term } from "~types"

export function calcTermGWA(subjects: Subject[]): { units: number; gwa: number } {
  let totalUnits = 0
  let totalWeighted = 0
  for (const s of subjects) {
    if (!isNaN(s.units) && !isNaN(s.grade) && s.units > 0 && !s.excludeFromGWA) {
      totalUnits += s.units
      totalWeighted += s.grade * s.units
    }
  }
  return { units: totalUnits, gwa: totalUnits > 0 ? totalWeighted / totalUnits : 0 }
}

export function calcCumulativeGWA(terms: Term[]): { units: number; gwa: number } {
  let totalUnits = 0
  let totalWeighted = 0
  for (const term of terms) {
    for (const s of term.subjects) {
      if (!isNaN(s.units) && !isNaN(s.grade) && !s.excludeFromGWA) {
        totalUnits += s.units
        totalWeighted += s.grade * s.units
      }
    }
  }
  return { units: totalUnits, gwa: totalUnits > 0 ? totalWeighted / totalUnits : 0 }
}

export function recalcTerms<T extends Record<string, { subjects: Subject[]; units: number; gwa: number }>>(
  terms: T
): T {
  const result = { ...terms }
  for (const key of Object.keys(result)) {
    const { units, gwa } = calcTermGWA(result[key].subjects)
    result[key] = { ...result[key], units, gwa }
  }
  return result
}
