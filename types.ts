export interface Subject {
  code: string
  units: number
  grade: number
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
