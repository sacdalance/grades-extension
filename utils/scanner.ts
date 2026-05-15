import type { CurrentData } from "~types"

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
