export interface Subject {
  code: string
  units: number
  grade: number
  gradeLabel?: string   // "INC" | "DRP" — overrides numeric display, always excludes from GWA
  excludeFromGWA?: boolean
}

export interface Term {
  term: string
  units: number
  gwa: number
  subjects: Subject[]
}

export interface SavedTerms {
  [termKey: string]: Term
}

export interface CurrentData {
  units: number
  gwa: number
  term: string
  subjects: Subject[]
}

export interface WhatIfSubject {
  id: number
  code: string
  units: number
  grade: number
  gradeLabel: string
  excludeFromGWA: boolean
}

export interface WhatIfTerm {
  id: number
  name: string
  subjects: WhatIfSubject[]
}
