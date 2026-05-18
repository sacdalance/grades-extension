import { useState, useEffect, useRef } from "react"
import { jsPDF } from "jspdf"
import { Button } from "~components/ui/button"
import { calcCumulativeGWA } from "~utils/calculator"
import type { SavedTerms } from "~types"

interface Props {
  savedTerms: SavedTerms
  termOrder: string[]
  onClose: () => void
}

export function PdfModal({ savedTerms, termOrder, onClose }: Props) {
  const keys = termOrder.filter(k => !!savedTerms[k])
  const [generating, setGenerating] = useState(false)
  const generatingRef = useRef(false)
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [fullName, setFullName] = useState("")
  const [course, setCourse] = useState("")

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      if (cancelled) return
      const c = document.createElement("canvas")
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const ctx = c.getContext("2d")!
      ctx.filter = "brightness(0)"
      ctx.drawImage(img, 0, 0)
      setLogoDataUrl(c.toDataURL("image/png"))
    }
    img.onerror = () => { if (!cancelled) setLogoDataUrl(null) }
    img.src = chrome.runtime.getURL("assets/l-logo-white.png")
    return () => { cancelled = true }
  }, [])

  const cumulative = calcCumulativeGWA(Object.values(savedTerms))

  const handleGenerate = () => {
    if (generatingRef.current) return
    generatingRef.current = true
    setGenerating(true)
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const PW = 210
      const PH = 297
      const ML = 18
      const MR = 18
      const MT = 18
      const CW = PW - ML - MR
      const HALF = CW / 2
      const GAP = 6
      const COL1_X = ML
      const COL2_X = ML + HALF + GAP / 2

      // helpers
      const drawTermTable = (termKey: string, startX: number, startY: number, colW: number): number => {
        const term = savedTerms[termKey]
        if (!term) return startY
        let y = startY
        const COL_SUBJ = startX
        const COL_UNITS = startX + colW - 22
        const COL_GRADE = startX + colW - 8
        const ROW_H = 5.5

        // Term name
        doc.setFontSize(8.5)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(0, 0, 0)
        doc.text(termKey, COL_SUBJ, y)
        y += 5

        // Column headers
        doc.setFontSize(7)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(120, 120, 120)
        doc.text("SUBJECT", COL_SUBJ, y)
        doc.text("UNITS", COL_UNITS, y, { align: "center" })
        doc.text("GRADE", COL_GRADE, y, { align: "center" })
        doc.setTextColor(0, 0, 0)
        y += 1.5
        doc.setDrawColor(180)
        doc.setLineWidth(0.2)
        doc.line(startX, y, startX + colW, y)
        y += 3.5

        // Rows
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        for (const s of term.subjects) {
          const excluded = !!s.excludeFromGWA
          const gradeLabel = s.gradeLabel || (s.grade === 0 ? "0" : s.grade.toFixed(2))
          doc.setTextColor(excluded ? 160 : 0)
          const maxSubjW = colW - 30
          let code = s.code + (excluded ? " (excl.)" : "")
          while (doc.getTextWidth(code) > maxSubjW && code.length > 1) {
            code = code.slice(0, -1)
          }
          doc.text(code, COL_SUBJ, y)
          doc.text(excluded ? `(${s.units})` : String(s.units), COL_UNITS, y, { align: "center" })
          doc.setFont("helvetica", "bold")
          doc.text(gradeLabel, COL_GRADE, y, { align: "center" })
          doc.setFont("helvetica", "normal")
          doc.setTextColor(0, 0, 0)
          y += ROW_H
        }

        // GWA badge — bottom row, units under UNITS col, GWA under GRADE col
        doc.setDrawColor(180)
        doc.setLineWidth(0.2)
        doc.line(startX, y, startX + colW, y)
        y += 1
        const unitsStr = `${Math.round(term.units)}`
        const gwaStr = term.gwa > 0 ? term.gwa.toFixed(4) : "0.0000"
        const badgeH = 5.5
        // units badge under UNITS
        const uBadgeW = 14
        doc.setFillColor(0, 0, 0)
        doc.rect(COL_UNITS - uBadgeW / 2, y, uBadgeW, badgeH, "F")
        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(255, 255, 255)
        doc.text(unitsStr, COL_UNITS, y + 3.8, { align: "center" })
        // gwa badge under GRADE
        const gBadgeW = doc.getTextWidth(gwaStr) + 4
        doc.setFillColor(0, 0, 0)
        doc.rect(COL_GRADE - gBadgeW / 2, y, gBadgeW, badgeH, "F")
        doc.text(gwaStr, COL_GRADE, y + 3.8, { align: "center" })
        doc.setTextColor(0, 0, 0)
        y += badgeH + 5

        return y
      }

      // ── Footer helper — drawn on every page ──────────────────────────────
      const FOOTER_Y = PH - 14
      const drawFooter = () => {
        doc.setDrawColor(200)
        doc.setLineWidth(0.2)
        doc.line(ML, FOOTER_Y, PW - MR, FOOTER_Y)
        if (logoDataUrl) {
          doc.addImage(logoDataUrl, "PNG", ML, FOOTER_Y + 2.5, 4, 4)
        }
        doc.setFontSize(6.5)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(140, 140, 140)
        doc.text(
          "For reference only. This is an unofficial estimate. Verify your official academic records with the Office of the University Registrar (OUR). GinaGWA mo?! is not affiliated with the University of the Philippines.",
          ML + (logoDataUrl ? 5.5 : 0),
          FOOTER_Y + 5,
          { maxWidth: CW - (logoDataUrl ? 5.5 : 0) }
        )
        doc.setTextColor(0, 0, 0)
      }
      drawFooter()

      let y = MT

      // ── Header ────────────────────────────────────────────────────────────
      const logoSize = 10
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", ML, y, logoSize, logoSize)
      }
      const txtX = logoDataUrl ? ML + logoSize + 3 : ML
      doc.setTextColor(0, 0, 0)

      if (fullName) {
        // Name + course beside logo
        doc.setFontSize(11)
        doc.setFont("helvetica", "bold")
        doc.text(fullName.toUpperCase(), txtX, y + 4.5)
        doc.setFontSize(7)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(80, 80, 80)
        doc.text(course ? course.toUpperCase() : "", txtX, y + 9)
      } else {
        // App name + subtitle beside logo
        doc.setFontSize(11)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(0, 0, 0)
        doc.text("GinaGWA mo?!", txtX, y + 4.5)
        doc.setFontSize(7)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(120, 120, 120)
        doc.text("AMIS GWA Calculator - Unofficial Grade Report", txtX, y + 9)
      }

      doc.setTextColor(0, 0, 0)
      y += Math.max(logoSize, 12) + 5

      // ── Cumulative summary — full-width solid black bar ───────────────────
      const cumGwaStr = cumulative.gwa > 0 ? cumulative.gwa.toFixed(4) : "0.0000"
      const cumBarH = 18
      doc.setFillColor(0, 0, 0)
      doc.rect(0, y, PW, cumBarH, "F")
      // Left: label + GWA
      doc.setTextColor(160, 160, 160)
      doc.setFontSize(6.5)
      doc.setFont("helvetica", "bold")
      doc.text("CUMULATIVE GWA", ML + 2, y + 4.5)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text(cumGwaStr, ML + 2, y + 13)

      // Right stats: terms, units — bold white labels + values
      const col1 = PW / 2 + 10
      const col2 = PW - MR - 20
      const statLabelY = y + 5
      const statValY = y + 13

      doc.setFontSize(6)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(160, 160, 160)
      doc.text("TERMS", col1, statLabelY)
      doc.text("TOTAL UNITS", col2, statLabelY)

      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(255, 255, 255)
      doc.text(String(keys.length), col1, statValY)
      doc.text(String(Math.round(cumulative.units)), col2, statValY)

      doc.setTextColor(0, 0, 0)
      y += cumBarH + 6

      // ── Two-column term tables (row-aligned pairs) ──────────────────────
      const colW = HALF - GAP / 2
      const termH = (key: string) => {
        const t = savedTerms[key]
        if (!t) return 0
        return 5 + 5 + 3.5 + t.subjects.length * 5.5 + 1 + 5.5 + 5
      }

      let rowY = y
      let i = 0
      while (i < keys.length) {
        const leftKey = keys[i]
        const rightKey = keys[i + 1]
        const rowH = Math.max(termH(leftKey), rightKey ? termH(rightKey) : 0)

        if (rowY + rowH > FOOTER_Y - 4) {
          doc.addPage()
          drawFooter()
          rowY = MT
        }

        drawTermTable(leftKey, COL1_X, rowY, colW)
        if (rightKey) drawTermTable(rightKey, COL2_X, rowY, colW)

        rowY += rowH
        i += 2
      }

      // ── Disclaimer ───────────────────────────────────────────────────────
      const legalH = 18
      if (rowY + legalH > FOOTER_Y - 4) { doc.addPage(); drawFooter(); rowY = MT }
      rowY += 4
      doc.setDrawColor(200)
      doc.setLineWidth(0.2)
      doc.line(ML, rowY, PW - MR, rowY)
      rowY += 4
      doc.setFontSize(7)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(80, 80, 80)
      doc.text("DISCLAIMER", ML, rowY)
      rowY += 3.5
      doc.setFont("helvetica", "normal")
      doc.setFontSize(6.5)
      doc.text(
        "This report was created using GinaGWA mo?! (AMIS GWA Calculator), a student-made browser extension. " +
        "The GWA figures shown here are computed estimates and may not account for INC grades, dropped subjects, or other adjustments made by your college or university. " +
        "Your grades and settings are only stored on your own device — nothing is sent anywhere. " +
        "This is not an official academic document. Please verify your records with the Office of the University Registrar (OUR). " +
        "GinaGWA mo?! is an independent project and is not affiliated with the University of the Philippines.",
        ML, rowY,
        { maxWidth: CW }
      )

      doc.save("gwa-report.pdf")
    } finally {
      generatingRef.current = false
      setGenerating(false)
    }
  }

  return (
    <div
      className="pointer-events-auto flex items-center justify-center"
      style={{ position: "fixed", inset: 0, zIndex: 2147483648, background: "rgba(0,0,0,0.4)", animation: "gwa-fade 0.15s ease-out both" }}>

      <div
        className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
        style={{ width: "min(24rem, 92vw)", animation: "gwa-slide-up 0.2s ease-out both" }}>

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Export PDF Report</h2>
            <p className="text-[10px] text-gray-400">{keys.length} term{keys.length !== 1 ? "s" : ""} · {Math.round(cumulative.units)} total units</p>
          </div>
          <Button variant="icon" size="icon" onClick={onClose} className="text-lg leading-none">×</Button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Full Name <span className="normal-case text-gray-300">(optional)</span></label>
              <input
                type="text"
                value={fullName}
                maxLength={80}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Juan dela Cruz"
                className="w-full h-8 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 focus:outline-none focus:border-upb-green/40 focus:ring-1 focus:ring-upb-green/20 hover:border-gray-300"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Degree Program <span className="normal-case text-gray-300">(optional)</span></label>
              <input
                type="text"
                value={course}
                maxLength={100}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. BS Computer Science"
                className="w-full h-8 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 focus:outline-none focus:border-upb-green/40 focus:ring-1 focus:ring-upb-green/20 hover:border-gray-300"
              />
            </div>
          </div>
          <div className="rounded-md bg-gray-50 border border-gray-100 px-4 py-3 space-y-1.5 text-[11px] text-gray-600">
            <p className="font-medium text-gray-800">What's included:</p>
            <ul className="space-y-1 text-gray-500">
              <li>• All saved terms with subject breakdown</li>
              <li>• Term GWA and units per term</li>
              <li>• Cumulative GWA summary</li>
              <li>• Disclaimer</li>
            </ul>
          </div>
          <p className="text-[10px] text-red-400 font-medium">Not an official document. For personal reference only.</p>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3.5 border-t border-gray-100 shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleGenerate} disabled={generating || keys.length === 0}>
            {generating ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>
    </div>
  )
}
