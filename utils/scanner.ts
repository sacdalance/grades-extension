import type { CurrentData } from "~types"

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export async function scanAllTerms(
  onProgress: (current: string, done: number, total: number) => void
): Promise<CurrentData[]> {
  // Click the Grades tab if not already on it
  const gradesTab = Array.from(document.querySelectorAll<HTMLElement>("a, button, li"))
    .find(el => el.textContent?.trim() === "Grades")
  if (gradesTab) {
    gradesTab.click()
    await sleep(1500)
  }

  const searchEl = document.querySelector<HTMLInputElement>(".vs__search")
  if (!searchEl) return []

  const typeIntoSearch = async (text: string) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
    setter?.call(searchEl, text)
    searchEl.dispatchEvent(new Event("input", { bubbles: true }))
    await sleep(500)
  }

  const getOptions = () =>
    Array.from(document.querySelectorAll<HTMLElement>(".vs__dropdown-option"))
      .map(o => o.textContent?.trim() ?? "").filter(Boolean)

  // Focus the search input
  searchEl.focus()
  await sleep(300)

  // Search for all common term keywords to discover all available terms
  const discovered = new Set<string>()
  for (const keyword of ["first", "second", "mid"]) {
    await typeIntoSearch(keyword)
    getOptions().forEach(t => discovered.add(t))
  }

  // Clear search
  await typeIntoSearch("")

  const termNames = Array.from(discovered)
  const total = termNames.length
  if (total === 0) return []

  const results: CurrentData[] = []

  for (let i = 0; i < total; i++) {
    const termName = termNames[i]
    onProgress(termName, i, total)

    // Type enough to find this specific term
    searchEl.focus()
    await sleep(200)
    await typeIntoSearch(termName.split(" ")[0])  // e.g. "First", "Second", "Midyear"

    const target = Array.from(
      document.querySelectorAll<HTMLElement>(".vs__dropdown-option")
    ).find(o => o.textContent?.trim() === termName)

    if (!target) continue
    target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
    target.click()

    // Wait for grades table to load
    await sleep(2000)

    const data = scanGradesFromPage()
    if (data && data.subjects.length > 0) {
      results.push({ ...data, term: termName })
    }
  }

  onProgress("", total, total)
  return results
}

function getCurrentTerm(): string {
  const selected = document.querySelector(".vs__selected")
  if (selected) return selected.textContent?.trim() ?? "Unknown Term"
  const el = Array.from(document.querySelectorAll<HTMLElement>("label, span, div")).find((e) => {
    const t = e.textContent ?? ""
    return (t.includes("Semester") || t.includes("Midyear")) && t.length < 50
  })
  return el?.textContent?.trim() ?? "Unknown Term"
}

export function scanGradesFromPage(): CurrentData | null {
  let targetTable: Element | null = null
  let unitsCol = -1
  let gradeCol = -1
  let codeCol = -1

  for (const table of document.querySelectorAll("table")) {
    const headers = Array.from(table.querySelectorAll("th, td")).map(
      (el) => el.textContent?.trim().toLowerCase() ?? ""
    )
    const uIdx = headers.findIndex((h) => h.includes("unit"))
    const gIdx = headers.findIndex((h) => h.includes("grade"))
    const cIdx = headers.findIndex((h) => h.includes("course") || h.includes("subject"))
    if (uIdx !== -1 && gIdx !== -1) {
      targetTable = table
      unitsCol = uIdx
      gradeCol = gIdx
      codeCol = cIdx
    }
  }

  if (!targetTable) return null

  const rows = Array.from(targetTable.querySelectorAll("tr")).slice(1)
  let totalWeighted = 0
  let totalUnits = 0
  const subjects: CurrentData["subjects"] = []

  const VALID_GRADES = [1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00, 4.00, 5.00]

  for (const row of rows) {
    const cells = row.querySelectorAll("td")
    if (cells.length <= Math.max(unitsCol, gradeCol)) continue
    const gradeText = cells[gradeCol].textContent?.trim() ?? ""
    const units     = parseFloat(cells[unitsCol].textContent?.trim() ?? "")
    const code      = codeCol !== -1 ? (cells[codeCol].textContent?.trim() ?? "Subject") : "Subject"
    if (isNaN(units)) continue

    const upperGrade = gradeText.toUpperCase()
    const isINC      = upperGrade === "INC"
    const isDRP      = upperGrade === "DRP" || upperGrade === "DROPPED"
    const gradeNum   = parseFloat(gradeText)
    const validGrade = isINC || isDRP || VALID_GRADES.includes(gradeNum)
    if (!validGrade) continue

    const grade          = (isINC || isDRP) ? 0 : gradeNum
    const gradeLabel     = isINC ? "INC" : isDRP ? "DRP" : undefined
    const excludeFromGWA = isINC || isDRP ||
      /^(PE|NSTP|ROTC|CWTS|LTS)\s/i.test(code) ||
      /^(PE|NSTP|ROTC|CWTS|LTS)\d/i.test(code)

    if (!excludeFromGWA) {
      totalWeighted += grade * units
      totalUnits    += units
    }
    subjects.push({ code, grade, gradeLabel, units, excludeFromGWA })
  }

  const term = getCurrentTerm()
  return {
    units: totalUnits,
    gwa: totalUnits > 0 ? totalWeighted / totalUnits : 0,
    term,
    subjects
  }
}
