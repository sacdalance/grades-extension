import { useState } from "react"
import { Button } from "~components/ui/button"
import { calcCumulativeGWA } from "~utils/calculator"
import { getScholarStatus } from "~utils/honors"
import type { SavedTerms } from "~types"

interface Props {
  savedTerms: SavedTerms
  termOrder: string[]
  onClose: () => void
}

const GREEN  = "#014421"
const GOLD   = "#B8860B"
const MAROON = "#7B0D1E"

function gradeColor(grade: number): string {
  if (grade <= 1.75) return GREEN
  if (grade <= 2.00) return GOLD
  if (grade <= 3.00) return "rgba(255,255,255,0.25)"
  return MAROON
}

export function ShareModal({ savedTerms, termOrder, onClose }: Props) {
  const keys = termOrder.filter(k => !!savedTerms[k])
  const [selectedKey, setSelectedKey] = useState(keys[keys.length - 1] ?? "")
  const [includeTable, setIncludeTable] = useState(true)
  const [showScholar, setShowScholar] = useState(true)
  const [downloading, setDownloading] = useState(false)

  const term = savedTerms[selectedKey]
  const cumulative = calcCumulativeGWA(Object.values(savedTerms))
  const scholar = term ? getScholarStatus(term.gwa, term.units, term.subjects) : null

  const handleDownload = () => {
    if (!term) return
    setDownloading(true)

    // Draw directly at 1080×1920 — no DPR scaling trick
    const W    = 1080
    const H    = 1920
    const PAD  = 96
    const FONT = "'Helvetica Neue', Arial, sans-serif"
    const subjects = includeTable ? term.subjects : []
    const scholarBadge = showScholar && scholar?.status ? scholar.status : null

    const canvas = document.createElement("canvas")
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext("2d")!
    ctx.clearRect(0, 0, W, H)
    ctx.textBaseline = "top"

    const setShadow = () => {
      ctx.shadowColor = "rgba(0,0,0,0.55)"
      ctx.shadowBlur  = 6
      ctx.shadowOffsetY = 2
    }
    const clearShadow = () => {
      ctx.shadowColor   = "transparent"
      ctx.shadowBlur    = 0
      ctx.shadowOffsetY = 0
    }

    // True text height (top baseline)
    const textH = (size: number) => {
      ctx.font = `400 ${size}px ${FONT}`
      const m = ctx.measureText("Ag")
      return m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
    }
    const line = (size: number, gap: number) => { y += textH(size) + gap }

    // ── Estimate content height for vertical centering ──────────────────
    const ROW_H   = 56
    const BADGE_H = 48
    const headerH = textH(14) + 10

    const contentH =
      (scholarBadge ? BADGE_H + 32 : 0) +
      textH(16) + 16 + textH(26) + 20 + textH(92) + 16 + textH(20) + 40 +
      2 +   // divider
      36 +
      textH(16) + 16 + textH(76) + 16 + (cumulative.units > 0 ? textH(20) + 40 : 0) +
      (subjects.length > 0
        ? 24 + headerH + subjects.length * ROW_H + 24
        : 0) +
      24 + 2 + 20 + textH(16)

    let y = Math.round(Math.max(PAD, (H - contentH) / 2))
    setShadow()

    // ── Scholar badge ──────────────────────────────────────────────────
    if (scholarBadge) {
      const rgba = scholarBadge === "University Scholar" ? "1,68,33"
        : scholarBadge === "Academic Achiever" ? "184,134,11" : "123,13,30"
      ctx.font = `600 18px ${FONT}`
      const tw     = ctx.measureText(scholarBadge.toUpperCase()).width
      const solidW = tw + 64
      const fadeW  = 96
      const totalW = solidW + fadeW * 2
      const bx     = W / 2 - totalW / 2
      clearShadow()
      const grd = ctx.createLinearGradient(bx, 0, bx + totalW, 0)
      grd.addColorStop(0,                  `rgba(${rgba},0)`)
      grd.addColorStop(fadeW / totalW,     `rgba(${rgba},0.95)`)
      grd.addColorStop(1 - fadeW / totalW, `rgba(${rgba},0.95)`)
      grd.addColorStop(1,                  `rgba(${rgba},0)`)
      ctx.fillStyle = grd
      ctx.fillRect(bx, y, totalW, BADGE_H)
      setShadow()
      ctx.fillStyle  = "#ffffff"
      ctx.textAlign  = "center"
      ctx.fillText(scholarBadge.toUpperCase(), W / 2, y + (BADGE_H - textH(18)) / 2)
      y += BADGE_H + 32
    }

    // ── Term GWA label ─────────────────────────────────────────────────
    ctx.font      = `600 16px ${FONT}`
    ctx.fillStyle = "rgba(255,255,255,0.6)"
    ctx.textAlign = "center"
    ctx.fillText("TERM GWA", W / 2, y)
    line(16, 16)

    // Term name
    ctx.font      = `400 26px ${FONT}`
    ctx.fillStyle = "#ffffff"
    ctx.fillText(selectedKey, W / 2, y)
    line(26, 20)

    // Term GWA value
    ctx.font      = `700 92px ${FONT}`
    ctx.fillStyle = "#ffffff"
    ctx.fillText(term.gwa.toFixed(4), W / 2, y)
    line(92, 16)

    // Units
    ctx.font      = `400 20px ${FONT}`
    ctx.fillStyle = "rgba(255,255,255,0.6)"
    ctx.fillText(`${Math.round(term.units)} units`, W / 2, y)
    line(20, 40)

    // Divider
    clearShadow()
    ctx.strokeStyle = "rgba(255,255,255,0.25)"
    ctx.lineWidth   = 2
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
    y += 36
    setShadow()

    // ── Cumulative GWA ─────────────────────────────────────────────────
    ctx.font      = `600 16px ${FONT}`
    ctx.fillStyle = "rgba(255,255,255,0.6)"
    ctx.fillText("CUMULATIVE GWA", W / 2, y)
    line(16, 16)

    ctx.font      = `700 76px ${FONT}`
    ctx.fillStyle = "#ffffff"
    ctx.fillText(cumulative.gwa > 0 ? cumulative.gwa.toFixed(4) : "—", W / 2, y)
    line(76, 16)

    if (cumulative.units > 0) {
      ctx.font      = `400 20px ${FONT}`
      ctx.fillStyle = "rgba(255,255,255,0.6)"
      ctx.fillText(`${Math.round(cumulative.units)} total units`, W / 2, y)
      line(20, 40)
    }

    // ── Subjects table ─────────────────────────────────────────────────
    if (subjects.length > 0) {
      clearShadow()
      ctx.strokeStyle = "rgba(255,255,255,0.25)"
      ctx.lineWidth   = 2
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
      y += 24

      const PILL_W = 140
      const PILL_H = 42
      const colSubject = PAD      // 96 — left-aligned
      const colGrade   = W - 165  // 915 — center of grade pill (right edge at 985 ≈ W-PAD)
      const colUnits   = W - 296  // 784 — center of units text

      const tableTop = y
      const tableH   = headerH + subjects.length * ROW_H + 24
      ctx.fillStyle = "rgba(0,0,0,0.35)"
      ctx.fillRect(0, tableTop, W, tableH)
      setShadow()

      // Headers
      ctx.font      = `500 14px ${FONT}`
      ctx.fillStyle = "rgba(255,255,255,0.5)"
      ctx.textAlign = "left"
      ctx.fillText("SUBJECT", colSubject, y)
      ctx.textAlign = "center"
      ctx.fillText("UNITS", colUnits, y)
      ctx.fillText("GRADE", colGrade, y)
      line(14, 10)

      for (const s of subjects) {
        const excluded  = !!s.excludeFromGWA
        const gradeBg   = excluded ? "rgba(255,255,255,0.15)" : gradeColor(s.grade)
        ctx.font        = `400 20px ${FONT}`
        const rowTextH  = textH(20)
        const textY     = Math.round(y + (ROW_H - rowTextH) / 2)
        const pillTop   = Math.round(y + (ROW_H - PILL_H) / 2)

        clearShadow()
        ctx.fillStyle = gradeBg
        ctx.fillRect(colGrade - PILL_W / 2, pillTop, PILL_W, PILL_H)
        setShadow()

        ctx.textAlign = "left"
        ctx.fillStyle = excluded ? "rgba(255,255,255,0.35)" : "#ffffff"
        ctx.fillText(s.code + (excluded ? " ·" : ""), colSubject, textY)

        ctx.textAlign = "center"
        ctx.fillStyle = "rgba(255,255,255,0.5)"
        ctx.fillText(String(s.units), colUnits, textY)

        ctx.font      = `600 20px ${FONT}`
        ctx.fillStyle = excluded ? "rgba(255,255,255,0.35)" : "#ffffff"
        ctx.fillText(s.grade.toFixed(2), colGrade, textY)

        y += ROW_H
      }
      y += 24
    }

    // ── Footer ─────────────────────────────────────────────────────────
    y += 24
    clearShadow()
    ctx.strokeStyle = "rgba(255,255,255,0.12)"
    ctx.lineWidth   = 2
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
    y += 20
    setShadow()
    ctx.font      = `400 16px ${FONT}`
    ctx.fillStyle = "rgba(255,255,255,0.3)"
    ctx.textAlign = "center"
    ctx.fillText("UPB AMIS GWA CALCULATOR", W / 2, y)

    canvas.toBlob(blob => {
      if (!blob) { setDownloading(false); return }
      const url = URL.createObjectURL(blob)
      const a   = document.createElement("a")
      a.href    = url
      a.download = `gwa-${selectedKey.replace(/\s+/g, "-").toLowerCase()}.png`
      a.click()
      URL.revokeObjectURL(url)
      setDownloading(false)
    }, "image/png")
  }

  // JSX preview card
  const shadow = "0 1px 3px rgba(0,0,0,0.6)"

  const cardContent = term ? (
    <>
      {showScholar && scholar?.status && (
        <div style={{
          margin: "0 -24px",
          marginBottom: "16px",
          padding: "5px 0",
          background: scholar.status === "University Scholar"
            ? `linear-gradient(to right, transparent, ${GREEN} 15%, ${GREEN} 85%, transparent)`
            : scholar.status === "Academic Achiever"
            ? `linear-gradient(to right, transparent, ${GOLD} 15%, ${GOLD} 85%, transparent)`
            : `linear-gradient(to right, transparent, ${MAROON} 15%, ${MAROON} 85%, transparent)`,
          textAlign: "center",
        }}>
          <span style={{
            color: "#fff",
            fontSize: "9px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            textShadow: shadow,
          }}>{scholar.status}</span>
        </div>
      )}

      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div style={{ fontSize: "9px", fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: "6px", textShadow: shadow }}>Term GWA</div>
        <div style={{ fontSize: "13px", color: "#fff", marginBottom: "8px", textShadow: shadow }}>{selectedKey}</div>
        <div style={{ fontSize: "46px", fontWeight: 700, lineHeight: 1, color: "#fff", textShadow: shadow }}>{term.gwa.toFixed(4)}</div>
        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", marginTop: "6px", textShadow: shadow }}>{Math.round(term.units)} units</div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.25)", marginBottom: "20px" }} />

      <div style={{ textAlign: "center", marginBottom: includeTable && term.subjects.length > 0 ? "16px" : "0" }}>
        <div style={{ fontSize: "9px", fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: "6px", textShadow: shadow }}>Cumulative GWA</div>
        <div style={{ fontSize: "38px", fontWeight: 700, lineHeight: 1, color: "#fff", textShadow: shadow }}>{cumulative.gwa > 0 ? cumulative.gwa.toFixed(4) : "—"}</div>
        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", marginTop: "6px", textShadow: shadow }}>{cumulative.units > 0 ? `${Math.round(cumulative.units)} total units` : ""}</div>
      </div>

      {includeTable && term.subjects.length > 0 && (
        <>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.25)", marginBottom: "0" }} />
          <div style={{ background: "rgba(0,0,0,0.35)", margin: "0 -24px", padding: "10px 24px 12px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", color: "rgba(255,255,255,0.45)", fontWeight: 500, paddingBottom: "6px", fontSize: "8px", textTransform: "uppercase" }}>Subject</th>
                  <th style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontWeight: 500, paddingBottom: "6px", fontSize: "8px", textTransform: "uppercase", width: "44px" }}>Units</th>
                  <th style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontWeight: 500, paddingBottom: "6px", fontSize: "8px", textTransform: "uppercase", width: "52px" }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {term.subjects.map((s, i) => (
                  <tr key={i}>
                    <td style={{ padding: "3px 0", color: s.excludeFromGWA ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.85)", textShadow: shadow }}>
                      {s.code}{s.excludeFromGWA ? <span style={{ fontSize: "8px", marginLeft: "4px", opacity: 0.6 }}>·</span> : null}
                    </td>
                    <td style={{ textAlign: "center", padding: "3px 0", color: "rgba(255,255,255,0.45)", textShadow: shadow }}>{s.units}</td>
                    <td style={{ textAlign: "center", padding: "3px 2px" }}>
                      <span style={{
                        display: "inline-block",
                        background: s.excludeFromGWA ? "rgba(255,255,255,0.15)" : gradeColor(s.grade),
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: "10px",
                        padding: "2px 8px",
                        minWidth: "36px",
                        textShadow: shadow,
                      }}>{s.grade.toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div style={{ marginTop: "16px", borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: "10px", textAlign: "center" }}>
        <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase" }}>UPB AMIS GWA Calculator</span>
      </div>
    </>
  ) : null

  return (
    <div
      className="pointer-events-auto flex items-center justify-center"
      style={{ position: "fixed", inset: 0, zIndex: 2147483648, background: "rgba(0,0,0,0.5)", animation: "gwa-fade 0.15s ease-out both" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div
        className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
        style={{ width: "min(26rem, 92vw)", maxHeight: "90vh", animation: "gwa-slide-up 0.2s ease-out both" }}>

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">Share GWA</h2>
          <Button variant="icon" size="icon" onClick={onClose} className="text-lg leading-none">×</Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Term</label>
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-upb-green appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
              {keys.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={includeTable} onChange={(e) => setIncludeTable(e.target.checked)} className="accent-upb-green" />
              <span className="text-xs text-gray-600">Include subjects breakdown</span>
            </label>
            {scholar?.status && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showScholar} onChange={(e) => setShowScholar(e.target.checked)} className="accent-upb-green" />
                <span className="text-xs text-gray-600">Show scholar status</span>
              </label>
            )}
          </div>

          {term ? (
            <div style={{ background: "#555", borderRadius: "12px", padding: "28px 24px 20px", fontFamily: "'Helvetica Neue', Arial, sans-serif", display: "flex", flexDirection: "column" }}>
              {cardContent}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No term selected.</p>
          )}

          <p className="text-[10px] text-gray-400">Exports as 1080×1920 transparent PNG (9:16) — overlay on any Instagram photo.</p>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3.5 border-t border-gray-100 shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleDownload} disabled={!term || downloading}>
            {downloading ? "Saving…" : "Save PNG"}
          </Button>
        </div>
      </div>
    </div>
  )
}
