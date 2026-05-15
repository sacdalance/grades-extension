import { useState, useEffect } from "react"
import { Button } from "~components/ui/button"
import { calcCumulativeGWA } from "~utils/calculator"
import { getScholarStatus, getLatinHonor, displayScholar, displayLatin } from "~utils/honors"
import type { SavedTerms } from "~types"

interface Props {
  savedTerms: SavedTerms
  termOrder: string[]
  onClose: () => void
}

const DARK_GREEN = "#15803d"
const LIGHT_GREEN = "#16a34a"
const AMBER = "#d97706"

function gradeColor(grade: number): string {
  if (grade <= 1.75) return LIGHT_GREEN
  if (grade <= 3.00) return DARK_GREEN
  return AMBER
}

export function ShareModal({ savedTerms, termOrder, onClose }: Props) {
  const keys = termOrder.filter(k => !!savedTerms[k])
  const [selectedKey, setSelectedKey] = useState(keys[keys.length - 1] ?? "")
  const [includeTable, setIncludeTable] = useState(true)
  const [showTermGWA, setShowTermGWA] = useState(true)
  const [showCumGWA, setShowCumGWA] = useState(true)
  const [showScholar, setShowScholar] = useState(true)
  const [showLatin, setShowLatin] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [copying, setCopying] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")

  const term = savedTerms[selectedKey]
  const cumulative = calcCumulativeGWA(Object.values(savedTerms))
  const scholar = term ? getScholarStatus(term.gwa, term.units, term.subjects) : null
  const latinHonor = getLatinHonor(cumulative.gwa)

  // ── Shared canvas drawing ────────────────────────────────────────────────
  const buildCanvas = (): HTMLCanvasElement | null => {
    if (!term) return null

    const S = 4
    const W = 376 * S
    const PAD = 20 * S
    const FONT = "'Helvetica Neue', Arial, sans-serif"
    const subjects = includeTable ? term.subjects : []
    const badge = showScholar && scholar?.status ? scholar.status : null
    const latinBadge = showLatin && latinHonor ? latinHonor : null
    const hasRightCol = showTermGWA || showCumGWA
    const hasTable = subjects.length > 0

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!
    ctx.textBaseline = "top"

    const tH = (size: number) => {
      ctx.font = `400 ${size}px ${FONT}`
      const m = ctx.measureText("Ag")
      return m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
    }

    const shadow = () => {
      ctx.shadowColor = "rgba(0,0,0,0.8)"
      ctx.shadowBlur = 3 * S
      ctx.shadowOffsetY = 1 * S
    }
    const noShadow = () => {
      ctx.shadowColor = "transparent"
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
    }
    const drawText = (text: string, x: number, y: number) => ctx.fillText(text, x, y)

    if (hasTable && hasRightCol) {
      // ── Two-column layout ──────────────────────────────────────────────
      const BADGE_H = 20 * S
      const ROW_H   = 20 * S
      const PILL_W  = 46 * S
      const PILL_H  = 17 * S

      const LEFT_PANEL_W = Math.round(W * 0.55)
      const RIGHT_X      = LEFT_PANEL_W + 8 * S
      const RIGHT_W      = W - RIGHT_X - PAD
      const RIGHT_C      = RIGHT_X + RIGHT_W / 2

      const TPAD_L  = 16 * S
      const TPAD_R  = 12 * S
      const TABLE_W = LEFT_PANEL_W - TPAD_L - TPAD_R
      const UNIT_CW = 28 * S
      const colGrade = TPAD_L + TABLE_W - PILL_W / 2
      const colUnits = colGrade - PILL_W / 2 - 4 * S - UNIT_CW / 2
      const colSubj  = TPAD_L

      let leftH = 0
      leftH += tH(7 * S) + 8 * S
      leftH += subjects.length * ROW_H

      let rightH = 0
      if (showTermGWA) {
        rightH += tH(7 * S) + 4 * S
        rightH += tH(8.5 * S) + 4 * S
        rightH += tH(28 * S) + 4 * S
        rightH += tH(8 * S) + 10 * S
        if (badge) rightH += BADGE_H + 10 * S
        else rightH += 2 * S
      }
      if (showTermGWA && showCumGWA) rightH += S + 10 * S
      if (showCumGWA) {
        rightH += tH(7 * S) + 4 * S
        rightH += tH(28 * S) + 4 * S
        if (cumulative.units > 0) rightH += tH(8 * S) + 8 * S
        if (latinBadge) rightH += 8 * S + BADGE_H
      }

      const contentH = Math.max(leftH, rightH)
      const footerSectionH = 8 * S + S + 6 * S + tH(8 * S) + 8 * S
      const yFoot = Math.round(14 * S + contentH) + 14 * S
      const totalH = yFoot + footerSectionH

      canvas.width = W
      canvas.height = Math.ceil(totalH)
      ctx.clearRect(0, 0, W, canvas.height)
      ctx.textBaseline = "top"

      noShadow()
      ctx.fillStyle = "rgba(0,0,0,0.22)"
      ctx.fillRect(0, 0, LEFT_PANEL_W, yFoot)

      let yL = 14 * S
      let yR = 14 * S + Math.max(0, (contentH - rightH) / 2)

      shadow()
      ctx.font = `500 ${7 * S}px ${FONT}`
      ctx.fillStyle = "rgba(255,255,255,0.45)"
      ctx.textAlign = "left"
      drawText("SUBJECT", colSubj, yL)
      ctx.textAlign = "center"
      drawText("UNITS", colUnits, yL)
      drawText("GRADE", colGrade, yL)
      yL += tH(7 * S) + 8 * S

      for (const s of subjects) {
        const excluded = !!s.excludeFromGWA
        const gradeBg = excluded ? "rgba(255,255,255,0.18)" : gradeColor(s.grade)
        const rowTH = tH(9 * S)
        const textY = Math.round(yL + (ROW_H - rowTH) / 2)
        const pillTop = Math.round(yL + (ROW_H - PILL_H) / 2)

        noShadow()
        ctx.fillStyle = gradeBg
        ctx.fillRect(colGrade - PILL_W / 2, pillTop, PILL_W, PILL_H)
        shadow()

        ctx.font = `400 ${9 * S}px ${FONT}`
        ctx.textAlign = "left"
        ctx.fillStyle = excluded ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.85)"
        drawText(s.code + (excluded ? " ·" : ""), colSubj, textY)

        ctx.textAlign = "center"
        ctx.fillStyle = "rgba(255,255,255,0.45)"
        drawText(String(s.units), colUnits, textY)

        ctx.font = `600 ${9 * S}px ${FONT}`
        ctx.fillStyle = excluded ? "rgba(255,255,255,0.5)" : "#fff"
        drawText(s.gradeLabel || (s.grade === 0 ? "—" : s.grade.toFixed(2)), colGrade, textY)

        yL += ROW_H
      }

      if (showTermGWA) {
        shadow()
        ctx.textAlign = "center"
        ctx.font = `600 ${7 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText("TERM GWA", RIGHT_C, yR); yR += tH(7 * S) + 4 * S

        ctx.font = `400 ${8.5 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText(selectedKey, RIGHT_C, yR); yR += tH(8.5 * S) + 4 * S

        ctx.font = `700 ${28 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText(term.gwa.toFixed(4), RIGHT_C, yR); yR += tH(28 * S) + 4 * S

        ctx.font = `400 ${8 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText(`${Math.round(term.units)} units`, RIGHT_C, yR); yR += tH(8 * S) + 10 * S

        if (badge) {
          const badgeLabel = displayScholar(badge as any).toUpperCase()
          noShadow()
          ctx.fillStyle = badge === "Academic Achiever" ? AMBER : DARK_GREEN
          ctx.fillRect(RIGHT_X, yR, RIGHT_W, BADGE_H)
          shadow()
          let badgeFs = 7 * S
          ctx.font = `700 ${badgeFs}px ${FONT}`
          while (ctx.measureText(badgeLabel).width > RIGHT_W - 12 * S && badgeFs > 5 * S) {
            badgeFs -= S
            ctx.font = `700 ${badgeFs}px ${FONT}`
          }
          ctx.fillStyle = "#fff"
          ctx.textAlign = "center"
          drawText(badgeLabel, RIGHT_C, yR + (BADGE_H - tH(badgeFs)) / 2)
          yR += BADGE_H + 10 * S
        } else {
          yR += 2 * S
        }
      }

      if (showTermGWA && showCumGWA) {
        noShadow()
        ctx.strokeStyle = "rgba(255,255,255,0.2)"
        ctx.lineWidth = S
        ctx.beginPath(); ctx.moveTo(RIGHT_X, yR); ctx.lineTo(RIGHT_X + RIGHT_W, yR); ctx.stroke()
        yR += S + 10 * S
      }

      if (showCumGWA) {
        shadow()
        ctx.font = `600 ${7 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText("CUMULATIVE GWA", RIGHT_C, yR); yR += tH(7 * S) + 4 * S

        ctx.font = `700 ${28 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText(cumulative.gwa > 0 ? cumulative.gwa.toFixed(4) : "—", RIGHT_C, yR)
        yR += tH(28 * S) + 4 * S

        if (cumulative.units > 0) {
          ctx.font = `400 ${8 * S}px ${FONT}`
          ctx.fillStyle = "#fff"
          drawText(`${Math.round(cumulative.units)} total units`, RIGHT_C, yR)
          yR += tH(8 * S) + 8 * S
        }

        if (latinBadge) {
          yR += 8 * S
          const latinLabel = displayLatin(latinBadge).toUpperCase()
          noShadow()
          ctx.fillStyle = "#18181b"
          ctx.fillRect(RIGHT_X, yR, RIGHT_W, BADGE_H)
          shadow()
          let badgeFs = 7 * S
          ctx.font = `700 ${badgeFs}px ${FONT}`
          while (ctx.measureText(latinLabel).width > RIGHT_W - 12 * S && badgeFs > 5 * S) {
            badgeFs -= S
            ctx.font = `700 ${badgeFs}px ${FONT}`
          }
          ctx.fillStyle = "#fff"
          ctx.textAlign = "center"
          drawText(latinLabel, RIGHT_C, yR + (BADGE_H - tH(badgeFs)) / 2)
        }
      }

      noShadow()
      ctx.strokeStyle = "rgba(255,255,255,0.12)"
      ctx.lineWidth = S
      ctx.beginPath(); ctx.moveTo(PAD, yFoot); ctx.lineTo(W - PAD, yFoot); ctx.stroke()
      shadow()
      ctx.font = `400 ${8 * S}px ${FONT}`
      ctx.fillStyle = "rgba(255,255,255,0.25)"
      ctx.textAlign = "center"
      drawText("AMIS GWA CALCULATOR", W / 2, yFoot + S + 6 * S)

    } else if (hasTable) {
      // ── Dynamic-width table (no right column) ─────────────────────────
      const ROW_H  = 20 * S
      const PILL_W = 46 * S
      const PILL_H = 17 * S
      const TPAD_L = 20 * S
      const TPAD_R = 20 * S
      const UNIT_CW = 28 * S

      // Measure subjects to compute tight width
      ctx.font = `400 ${9 * S}px ${FONT}`
      let maxSubjW = ctx.measureText("SUBJECT").width
      for (const s of subjects) {
        const text = s.code + (s.excludeFromGWA ? " ·" : "")
        maxSubjW = Math.max(maxSubjW, ctx.measureText(text).width)
      }

      // Compute width: padding + subject + gap + units + gap + grade pill + padding
      const CW = Math.max(240 * S, Math.min(W, TPAD_L + maxSubjW + 20 * S + UNIT_CW + 8 * S + PILL_W + TPAD_R))
      const TABLE_W = CW - TPAD_L - TPAD_R

      const colGrade = TPAD_L + TABLE_W - PILL_W / 2
      const colUnits = colGrade - PILL_W / 2 - 6 * S - UNIT_CW / 2
      const colSubj  = TPAD_L

      let contentH = 0
      contentH += tH(7 * S) + 8 * S
      contentH += subjects.length * ROW_H

      const yFoot = Math.ceil(14 * S + contentH) + 14 * S
      const totalH = yFoot + S + 6 * S + tH(8 * S) + 8 * S

      canvas.width = CW
      canvas.height = Math.ceil(totalH)
      ctx.clearRect(0, 0, CW, canvas.height)
      ctx.textBaseline = "top"

      noShadow()
      ctx.fillStyle = "rgba(0,0,0,0.22)"
      ctx.fillRect(0, 0, CW, yFoot)

      let y = 14 * S

      shadow()
      ctx.font = `500 ${7 * S}px ${FONT}`
      ctx.fillStyle = "rgba(255,255,255,0.45)"
      ctx.textAlign = "left"
      drawText("SUBJECT", colSubj, y)
      ctx.textAlign = "center"
      drawText("UNITS", colUnits, y)
      drawText("GRADE", colGrade, y)
      y += tH(7 * S) + 8 * S

      for (const s of subjects) {
        const excluded = !!s.excludeFromGWA
        const gradeBg = excluded ? "rgba(255,255,255,0.18)" : gradeColor(s.grade)
        const rowTH = tH(9 * S)
        const textY = Math.round(y + (ROW_H - rowTH) / 2)
        const pillTop = Math.round(y + (ROW_H - PILL_H) / 2)

        noShadow()
        ctx.fillStyle = gradeBg
        ctx.fillRect(colGrade - PILL_W / 2, pillTop, PILL_W, PILL_H)
        shadow()

        ctx.font = `400 ${9 * S}px ${FONT}`
        ctx.textAlign = "left"
        ctx.fillStyle = excluded ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.85)"
        drawText(s.code + (excluded ? " ·" : ""), colSubj, textY)

        ctx.textAlign = "center"
        ctx.fillStyle = "rgba(255,255,255,0.45)"
        drawText(String(s.units), colUnits, textY)

        ctx.font = `600 ${9 * S}px ${FONT}`
        ctx.fillStyle = excluded ? "rgba(255,255,255,0.5)" : "#fff"
        drawText(s.gradeLabel || (s.grade === 0 ? "—" : s.grade.toFixed(2)), colGrade, textY)

        y += ROW_H
      }

      noShadow()
      ctx.strokeStyle = "rgba(255,255,255,0.12)"
      ctx.lineWidth = S
      ctx.beginPath(); ctx.moveTo(PAD, yFoot); ctx.lineTo(CW - PAD, yFoot); ctx.stroke()
      shadow()
      ctx.font = `400 ${8 * S}px ${FONT}`
      ctx.fillStyle = "rgba(255,255,255,0.25)"
      ctx.textAlign = "center"
      drawText("AMIS GWA CALCULATOR", CW / 2, yFoot + S + 6 * S)

    } else {
      // ── Single-column centered layout ──────────────────────────────────
      const BADGE_H = 24 * S

      // Measure widest elements to compute tight canvas width
      canvas.width = 4000
      const mW = (text: string, font: string) => { ctx.font = font; return ctx.measureText(text).width }
      const badgeLabel  = badge      ? displayScholar(badge as any).toUpperCase() : ""
      const latinLabel  = latinBadge ? displayLatin(latinBadge).toUpperCase()     : ""
      let contentH = 0
      if (showTermGWA) {
        contentH += tH(9 * S) + 6 * S
        contentH += tH(11 * S) + 8 * S
        contentH += tH(42 * S) + 6 * S
        contentH += tH(10 * S) + 12 * S
        if (badge) contentH += BADGE_H + 8 * S
        else contentH += 8 * S
      }
      if (showTermGWA && showCumGWA) contentH += S + 16 * S
      if (showCumGWA) {
        contentH += tH(9 * S) + 6 * S
        contentH += tH(42 * S) + 6 * S
        if (cumulative.units > 0) contentH += tH(10 * S) + 8 * S
        if (latinBadge) contentH += BADGE_H + 8 * S
      }

      const footerH = 8 * S + S + 6 * S + tH(8 * S) + 8 * S
      const widths = [
        showTermGWA && badge      ? mW(badgeLabel,  `700 ${9 * S}px ${FONT}`) + 2 * PAD + 32 * S : 0,
        showCumGWA  && latinBadge ? mW(latinLabel,  `700 ${9 * S}px ${FONT}`) + 2 * PAD + 32 * S : 0,
        showTermGWA               ? mW(selectedKey, `400 ${11 * S}px ${FONT}`) + 2 * PAD : 0,
        showTermGWA               ? mW(term.gwa.toFixed(4), `700 ${42 * S}px ${FONT}`) + 2 * PAD : 0,
        showCumGWA                ? mW(cumulative.gwa > 0 ? cumulative.gwa.toFixed(4) : "—", `700 ${42 * S}px ${FONT}`) + 2 * PAD : 0,
      ]
      const CW = Math.ceil(Math.max(220 * S, ...widths))
      const totalH = Math.max(240 * S, contentH + footerH + 64 * S)

      canvas.width = CW
      canvas.height = Math.ceil(totalH)
      ctx.clearRect(0, 0, CW, canvas.height)
      ctx.textBaseline = "top"

      // Center the whole block (content + footer) in the canvas
      let y = Math.round((canvas.height - contentH - footerH) / 2)
      if (y < 24 * S) y = 24 * S

      const CX = CW / 2
      const CPAD = PAD

      noShadow()
      ctx.textAlign = "center"
      ctx.fillStyle = "#fff"

      if (showTermGWA) {
        shadow()
        ctx.font = `600 ${9 * S}px ${FONT}`
        drawText("TERM GWA", CX, y); y += tH(9 * S) + 6 * S

        ctx.font = `400 ${11 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText(selectedKey, CX, y); y += tH(11 * S) + 8 * S

        ctx.font = `700 ${42 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText(term.gwa.toFixed(4), CX, y); y += tH(42 * S) + 6 * S

        ctx.font = `400 ${10 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText(`${Math.round(term.units)} units`, CX, y); y += tH(10 * S) + 12 * S

        if (badge) {
          noShadow()
          ctx.fillStyle = badge === "Academic Achiever" ? AMBER : DARK_GREEN
          ctx.fillRect(CPAD, y, CW - CPAD * 2, BADGE_H)
          shadow()
          ctx.font = `700 ${9 * S}px ${FONT}`
          ctx.fillStyle = "#fff"
          ctx.textAlign = "center"
          drawText(badgeLabel, CX, y + (BADGE_H - tH(9 * S)) / 2)
          y += BADGE_H + 8 * S
        } else {
          y += 8 * S
        }
      }

      if (showTermGWA && showCumGWA) {
        noShadow()
        ctx.strokeStyle = "rgba(255,255,255,0.25)"
        ctx.lineWidth = S
        ctx.beginPath(); ctx.moveTo(CPAD, y); ctx.lineTo(CW - CPAD, y); ctx.stroke()
        y += S + 16 * S
      }

      if (showCumGWA) {
        shadow()
        ctx.font = `600 ${9 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText("CUMULATIVE GWA", CX, y); y += tH(9 * S) + 6 * S

        ctx.font = `700 ${42 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText(cumulative.gwa > 0 ? cumulative.gwa.toFixed(4) : "—", CX, y)
        y += tH(42 * S) + 6 * S

        if (cumulative.units > 0) {
          ctx.font = `400 ${10 * S}px ${FONT}`
          ctx.fillStyle = "#fff"
          drawText(`${Math.round(cumulative.units)} total units`, CX, y)
          y += tH(10 * S) + 8 * S
        }

        if (latinBadge) {
          noShadow()
          ctx.fillStyle = "#18181b"
          ctx.fillRect(CPAD, y, CW - CPAD * 2, BADGE_H)
          shadow()
          ctx.font = `700 ${9 * S}px ${FONT}`
          ctx.fillStyle = "#fff"
          ctx.textAlign = "center"
          drawText(latinLabel, CX, y + (BADGE_H - tH(9 * S)) / 2)
        }
      }

      // Draw footer relative to centered content
      const footerY = y + contentH + 8 * S
      noShadow()
      ctx.strokeStyle = "rgba(255,255,255,0.12)"
      ctx.lineWidth = S
      ctx.beginPath(); ctx.moveTo(CPAD, footerY); ctx.lineTo(CW - CPAD, footerY); ctx.stroke()
      shadow()
      ctx.font = `400 ${8 * S}px ${FONT}`
      ctx.fillStyle = "rgba(255,255,255,0.25)"
      ctx.textAlign = "center"
      drawText("AMIS GWA CALCULATOR", CX, footerY + S + 6 * S)
    }

    return canvas
  }

  // ── Regenerate preview whenever options change ───────────────────────────
  useEffect(() => {
    const canvas = buildCanvas()
    if (!canvas) { setPreviewUrl(""); return }
    setPreviewUrl(canvas.toDataURL("image/png"))
  }, [selectedKey, includeTable, showTermGWA, showCumGWA, showScholar, showLatin, term, cumulative.gwa])

  const handleDownload = () => {
    const canvas = buildCanvas()
    if (!canvas) return
    setDownloading(true)
    canvas.toBlob(blob => {
      if (!blob) { setDownloading(false); return }
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `gwa-${selectedKey.replace(/\s+/g, "-").toLowerCase()}.png`
      a.click()
      URL.revokeObjectURL(url)
      setDownloading(false)
    }, "image/png")
  }

  const handleCopy = () => {
    const canvas = buildCanvas()
    if (!canvas) return
    setCopying(true)
    canvas.toBlob(async blob => {
      if (!blob) { setCopying(false); return }
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ])
        setTimeout(() => setCopying(false), 2000)
      } catch (err) {
        console.error("Copy failed", err)
        setCopying(false)
      }
    }, "image/png")
  }

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
              className="w-full h-8 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-800 transition-colors hover:border-gray-300 focus:border-upb-green/40 focus:outline-none focus:ring-1 focus:ring-upb-green/20 cursor-pointer">
              {keys.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          <div className="rounded-md border border-gray-100 divide-y divide-gray-100">
            <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="checkbox" checked={includeTable} onChange={(e) => setIncludeTable(e.target.checked)} className="accent-upb-green" />
              <span className="text-xs text-gray-700">Include subjects breakdown</span>
            </label>
            <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="checkbox" checked={showTermGWA} onChange={(e) => setShowTermGWA(e.target.checked)} className="accent-upb-green" />
              <span className="text-xs text-gray-700">Show term GWA</span>
            </label>
            <label className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${showTermGWA ? "cursor-pointer hover:bg-gray-50" : "opacity-40 cursor-not-allowed"}`}>
              <input type="checkbox" checked={showScholar} onChange={(e) => setShowScholar(e.target.checked)} className="accent-upb-green" disabled={!showTermGWA} />
              <span className="text-xs text-gray-700 flex-1">Show scholar status badge</span>
              {showTermGWA && showScholar && !scholar?.status && (
                <span className="text-[10px] text-gray-400 italic">not qualified</span>
              )}
            </label>
            <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="checkbox" checked={showCumGWA} onChange={(e) => setShowCumGWA(e.target.checked)} className="accent-upb-green" />
              <span className="text-xs text-gray-700">Show cumulative GWA</span>
            </label>
            <label className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${showCumGWA ? "cursor-pointer hover:bg-gray-50" : "opacity-40 cursor-not-allowed"}`}>
              <input type="checkbox" checked={showLatin} onChange={(e) => setShowLatin(e.target.checked)} className="accent-upb-green" disabled={!showCumGWA} />
              <span className="text-xs text-gray-700 flex-1">Show latin honor estimate</span>
              {showCumGWA && showLatin && !latinHonor && (
                <span className="text-[10px] text-gray-400 italic">not qualified</span>
              )}
            </label>
          </div>

          {/* Preview — rendered from the same canvas as the export */}
          {previewUrl ? (
            <div style={{ background: "#e5e7eb", borderRadius: "8px", padding: "8px" }}>
              <img
                src={previewUrl}
                alt="GWA card preview"
                style={{ width: "100%", borderRadius: "4px", display: "block" }}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No term selected.</p>
          )}

          <p className="text-[10px] text-gray-400">Preview is the exact PNG that will be saved — transparent background for overlaying on photos.</p>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3.5 border-t border-gray-100 shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" size="sm" onClick={handleCopy} disabled={!term || copying}>
            {copying ? "Copied!" : "Copy PNG"}
          </Button>
          <Button size="sm" onClick={handleDownload} disabled={!term || downloading}>
            {downloading ? "Saving…" : "Save PNG"}
          </Button>
        </div>
      </div>
    </div>
  )
}
