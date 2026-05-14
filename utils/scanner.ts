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

  for (const row of rows) {
    const cells = row.querySelectorAll("td")
    if (cells.length <= Math.max(unitsCol, gradeCol)) continue
    const grade = parseFloat(cells[gradeCol].textContent?.trim() ?? "")
    const units = parseFloat(cells[unitsCol].textContent?.trim() ?? "")
    const code = codeCol !== -1 ? (cells[codeCol].textContent?.trim() ?? "Subject") : "Subject"
    if (!isNaN(grade) && !isNaN(units) && grade >= 1.0 && grade <= 5.0) {
      const excludeFromGWA = /^(PE|NSTP|ROTC|CWTS|LTS)\s/i.test(code) || /^(PE|NSTP|ROTC|CWTS|LTS)\d/i.test(code)
      if (!excludeFromGWA) {
        totalWeighted += grade * units
        totalUnits += units
      }
      subjects.push({ code, grade, units, excludeFromGWA })
    }
  }

  const term = getCurrentTerm()
  return {
    units: totalUnits,
    gwa: totalUnits > 0 ? totalWeighted / totalUnits : 0,
    term,
    subjects
  }
}
