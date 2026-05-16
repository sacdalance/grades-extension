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

const GREEN_LIGHT = "#16a34a"
const GREEN_DARK = "#166534"
const BLACK = "#000000"

function gradeColor(grade: number): string {
  if (grade <= 1.75) return GREEN_LIGHT
  if (grade <= 3.00) return GREEN_DARK
  return BLACK
}

export function ShareModal({ savedTerms, termOrder, onClose }: Props) {
  const keys = termOrder.filter(k => !!savedTerms[k])
  const [selectedKey, setSelectedKey] = useState(keys[keys.length - 1] ?? "")
  const [includeTable, setIncludeTable] = useState(true)
  const [showTermGWA, setShowTermGWA] = useState(true)
  const [showCumGWA, setShowCumGWA] = useState(true)
  const [showScholar, setShowScholar] = useState(true)
  const [showLatin, setShowLatin] = useState(true)
  const [redactGWA, setRedactGWA] = useState(false)
  const [showShadow, setShowShadow] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [copying, setCopying] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.onload = () => { if (!cancelled) setLogoImg(img) }
    img.onerror = () => { if (!cancelled) setLogoImg(null) }
    img.src = chrome.runtime.getURL("assets/l-logo-white.png")
    return () => { cancelled = true }
  }, [])
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
    const FONT = "Inter, 'Helvetica Neue', Arial, sans-serif"
    const subjects = includeTable ? term.subjects : []
    const badge = showScholar && scholar?.status ? scholar.status : null
    const latinBadge = showLatin && latinHonor ? latinHonor : null
    const fmt = (gwa: number) => redactGWA ? `${Math.floor(gwa)}.xx` : gwa.toFixed(4)
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

    const noShadow = () => {
      ctx.shadowColor = "transparent"
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
    }
    const drawText = (text: string, x: number, y: number) => ctx.fillText(text, x, y)

    if (!hasTable && !hasRightCol) {
      // ── Logo-only layout ──────────────────────────────────────────────
      const SIZE = 200 * S
      canvas.width = SIZE
      canvas.height = SIZE
      ctx.clearRect(0, 0, SIZE, SIZE)
      ctx.textBaseline = "top"
      if (logoImg) {
        const logoSize = 80 * S
        ctx.globalAlpha = 1
        ctx.drawImage(logoImg, (SIZE - logoSize) / 2, (SIZE - logoSize) / 2, logoSize, logoSize)
      }
      return canvas
    }

    if (hasTable && hasRightCol) {
      // ── Two-column layout ──────────────────────────────────────────────
      const BADGE_H = 14 * S
      const ROW_H = 20 * S
      const PILL_W = 46 * S
      const PILL_H = 17 * S

      const LEFT_PANEL_W = Math.round(W * 0.55)
      const RPAD = 14 * S
      const RIGHT_X = LEFT_PANEL_W + RPAD
      const RIGHT_W = W - RIGHT_X - RPAD
      const RIGHT_C = LEFT_PANEL_W + (W - LEFT_PANEL_W) / 2

      const TPAD_L = 16 * S
      const TPAD_R = 12 * S
      const TABLE_W = LEFT_PANEL_W - TPAD_L - TPAD_R
      const UNIT_CW = 28 * S
      const colGrade = TPAD_L + TABLE_W - PILL_W / 2
      const colUnits = colGrade - PILL_W / 2 - 4 * S - UNIT_CW / 2
      const colSubj = TPAD_L

      let leftH = 0
      leftH += tH(9 * S) + 14 * S  // term name
      leftH += tH(7 * S) + 8 * S   // header
      leftH += subjects.length * ROW_H
      leftH += 10 * S + tH(6 * S)  // disclaimer

      let rightH = 0
      if (showTermGWA) {
        rightH += tH(7 * S) + 4 * S
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
      const yFoot = Math.round(14 * S + contentH) + 14 * S

      canvas.width = W
      canvas.height = Math.ceil(yFoot)
      ctx.clearRect(0, 0, W, canvas.height)
      ctx.textBaseline = "top"

      noShadow()
      // White left panel
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, LEFT_PANEL_W, canvas.height)
      ctx.fillStyle = "rgba(0,0,0,0.35)"
      ctx.fillRect(LEFT_PANEL_W, 0, W - LEFT_PANEL_W, canvas.height)

      let yL = 14 * S
      const yRBase = Math.round((yFoot - rightH) / 2)
      let yR = Math.max(14 * S, yRBase)

      // ── Term name ──────────────────────────────────────────────────────
      noShadow()
      ctx.font = `700 ${9 * S}px ${FONT}`
      ctx.fillStyle = "rgba(0,0,0,0.85)"
      ctx.textAlign = "left"
      drawText(selectedKey, colSubj, yL)
      yL += tH(9 * S) + 14 * S

      // ── Table header ───────────────────────────────────────────────────
      ctx.font = `500 ${7 * S}px ${FONT}`
      ctx.fillStyle = "rgba(0,0,0,0.80)"
      ctx.textAlign = "left"
      drawText("SUBJECT", colSubj, yL)
      ctx.textAlign = "center"
      drawText("UNITS", colUnits, yL)
      drawText("GRADE", colGrade, yL)
      yL += tH(7 * S) + 8 * S

      // Header bottom border
      ctx.strokeStyle = "rgba(0,0,0,0.10)"
      ctx.lineWidth = S
      ctx.beginPath(); ctx.moveTo(0, yL - 4 * S); ctx.lineTo(LEFT_PANEL_W, yL - 4 * S); ctx.stroke()

      // ── Subject rows ───────────────────────────────────────────────────
      for (const s of subjects) {
        const excluded = !!s.excludeFromGWA
        const gradeBg = excluded ? "rgba(0,0,0,0.07)" : gradeColor(s.grade)
        const rowTH = tH(9 * S)
        const textY = Math.round(yL + (ROW_H - rowTH) / 2)
        const pillTop = Math.round(yL + (ROW_H - PILL_H) / 2)

        noShadow()
        ctx.fillStyle = gradeBg
        ctx.fillRect(colGrade - PILL_W / 2, pillTop, PILL_W, PILL_H)

        ctx.font = `600 ${9 * S}px ${FONT}`
        ctx.textAlign = "left"
        ctx.fillStyle = excluded ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.85)"
        drawText(s.code + (excluded ? " ·" : ""), colSubj, textY)

        ctx.textAlign = "center"
        ctx.fillStyle = excluded ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.85)"
        drawText(String(s.units), colUnits, textY)

        ctx.font = `600 ${9 * S}px ${FONT}`
        ctx.fillStyle = excluded ? "rgba(0,0,0,0.25)" : "#fff"
        drawText(s.gradeLabel || (s.grade === 0 ? "—" : s.grade.toFixed(2)), colGrade, textY)

        yL += ROW_H
      }

      // Disclaimer with logo
      noShadow()
      const dLogoSize = 10 * S
      const dLineH = Math.max(dLogoSize, tH(6 * S))
      const dBaseY = yL + 10 * S
      if (logoImg) {
        ctx.filter = "brightness(0)"
        ctx.globalAlpha = 0.3
        ctx.drawImage(logoImg, colSubj, dBaseY + (dLineH - dLogoSize) / 2, dLogoSize, dLogoSize)
        ctx.filter = "none"
        ctx.globalAlpha = 1
      }
      ctx.font = `400 ${6 * S}px ${FONT}`
      ctx.fillStyle = "rgba(0,0,0,0.30)"
      ctx.textAlign = "left"
      drawText("For reference only. Verify with OUR.", colSubj + (logoImg ? dLogoSize + 3 * S : 0), dBaseY + (dLineH - tH(6 * S)) / 2)

      // ── Right panel (GWA) ──────────────────────────────────────────────
      if (showTermGWA) {
        noShadow()
        ctx.textAlign = "center"
        ctx.font = `600 ${7 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText("TERM GWA", RIGHT_C, yR); yR += tH(7 * S) + 4 * S

        ctx.font = `700 ${28 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText(fmt(term.gwa), RIGHT_C, yR); yR += tH(28 * S) + 4 * S

        ctx.font = `500 ${7 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText(`${Math.round(term.units)} UNITS`, RIGHT_C, yR); yR += tH(7 * S) + 10 * S

        if (badge) {
          const badgeLabel = displayScholar(badge as any).toUpperCase()
          let badgeFs = 11 * S
          ctx.font = `700 ${badgeFs}px ${FONT}`
          ctx.letterSpacing = `${0.6 * S}px`
          while (ctx.measureText(badgeLabel).width > RIGHT_W - 28 * S && badgeFs > 5 * S) {
            badgeFs -= S
            ctx.font = `700 ${badgeFs}px ${FONT}`
          }
          ctx.letterSpacing = "0px"
          const bC = document.createElement("canvas")
          bC.width = RIGHT_W; bC.height = BADGE_H
          const bX = bC.getContext("2d")!
          bX.textBaseline = "top"
          bX.fillStyle = "rgba(255,255,255,0.92)"
          bX.fillRect(0, 0, RIGHT_W, BADGE_H)
          bX.font = `700 ${badgeFs}px ${FONT}`
          bX.letterSpacing = `${0.6 * S}px`
          bX.globalCompositeOperation = "destination-out"
          bX.fillStyle = "rgba(0,0,0,1)"
          bX.strokeStyle = "rgba(0,0,0,1)"
          bX.lineWidth = S * 0.35
          bX.textAlign = "center"
          const bTY = (BADGE_H - tH(badgeFs)) / 2
          bX.strokeText(badgeLabel, RIGHT_W / 2, bTY)
          bX.fillText(badgeLabel, RIGHT_W / 2, bTY)
          ctx.drawImage(bC, RIGHT_X, yR)
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
        noShadow()
        ctx.textAlign = "center"
        ctx.font = `600 ${7 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText("CUMULATIVE GWA", RIGHT_C, yR); yR += tH(7 * S) + 4 * S

        ctx.font = `700 ${28 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText(cumulative.gwa > 0 ? fmt(cumulative.gwa) : "—", RIGHT_C, yR)
        yR += tH(28 * S) + 4 * S

        if (cumulative.units > 0) {
          ctx.font = `500 ${7 * S}px ${FONT}`
          ctx.fillStyle = "#fff"
          drawText(`${Math.round(cumulative.units)} TOTAL UNITS`, RIGHT_C, yR)
          yR += tH(7 * S) + 8 * S
        }

        if (latinBadge) {
          yR += 8 * S
          const latinLabel = displayLatin(latinBadge).toUpperCase()
          let badgeFs = 11 * S
          ctx.font = `700 ${badgeFs}px ${FONT}`
          ctx.letterSpacing = `${0.6 * S}px`
          while (ctx.measureText(latinLabel).width > RIGHT_W - 28 * S && badgeFs > 5 * S) {
            badgeFs -= S
            ctx.font = `700 ${badgeFs}px ${FONT}`
          }
          ctx.letterSpacing = "0px"
          const lC = document.createElement("canvas")
          lC.width = RIGHT_W; lC.height = BADGE_H
          const lX = lC.getContext("2d")!
          lX.textBaseline = "top"
          lX.fillStyle = "rgba(255,255,255,0.92)"
          lX.fillRect(0, 0, RIGHT_W, BADGE_H)
          lX.font = `700 ${badgeFs}px ${FONT}`
          lX.letterSpacing = `${0.6 * S}px`
          lX.globalCompositeOperation = "destination-out"
          lX.fillStyle = "rgba(0,0,0,1)"
          lX.strokeStyle = "rgba(0,0,0,1)"
          lX.lineWidth = S * 0.35
          lX.textAlign = "center"
          const lTY = (BADGE_H - tH(badgeFs)) / 2
          lX.strokeText(latinLabel, RIGHT_W / 2, lTY)
          lX.fillText(latinLabel, RIGHT_W / 2, lTY)
          ctx.drawImage(lC, RIGHT_X, yR)
        }
      }

    } else if (hasTable) {
      // ── Dynamic-width white table (no right column) ────────────────────
      const ROW_H = 20 * S
      const PILL_W = 46 * S
      const PILL_H = 17 * S
      const TPAD_L = 20 * S
      const TPAD_R = 20 * S
      const UNIT_CW = 28 * S

      // Measure to compute tight width (use bold font for subjects)
      ctx.font = `600 ${9 * S}px ${FONT}`
      let maxSubjW = ctx.measureText("SUBJECT").width
      for (const s of subjects) {
        maxSubjW = Math.max(maxSubjW, ctx.measureText(s.code + (s.excludeFromGWA ? " ·" : "")).width)
      }
      // Also account for term name width
      ctx.font = `600 ${9 * S}px ${FONT}`
      const termNameW = ctx.measureText(selectedKey).width

      const CW = Math.max(240 * S, Math.min(W, Math.max(
        TPAD_L + termNameW + TPAD_R,
        TPAD_L + maxSubjW + 20 * S + UNIT_CW + 8 * S + PILL_W + TPAD_R
      )))
      const TABLE_W = CW - TPAD_L - TPAD_R
      const colGrade = TPAD_L + TABLE_W - PILL_W / 2
      const colUnits = colGrade - PILL_W / 2 - 6 * S - UNIT_CW / 2
      const colSubj = TPAD_L

      let contentH = 0
      contentH += tH(9 * S) + 14 * S  // term name
      contentH += tH(7 * S) + 8 * S   // header
      contentH += subjects.length * ROW_H
      contentH += 10 * S + tH(6 * S)  // disclaimer

      canvas.width = CW
      canvas.height = Math.ceil(14 * S + contentH + 14 * S)
      ctx.clearRect(0, 0, CW, canvas.height)
      ctx.textBaseline = "top"

      noShadow()
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, CW, canvas.height)

      let y = 14 * S

      // Term name
      ctx.font = `600 ${9 * S}px ${FONT}`
      ctx.fillStyle = "rgba(0,0,0,0.80)"
      ctx.textAlign = "left"
      drawText(selectedKey, colSubj, y)
      y += tH(9 * S) + 14 * S

      // Header
      ctx.font = `500 ${7 * S}px ${FONT}`
      ctx.fillStyle = "rgba(0,0,0,0.80)"
      ctx.textAlign = "left"
      drawText("SUBJECT", colSubj, y)
      ctx.textAlign = "center"
      drawText("UNITS", colUnits, y)
      drawText("GRADE", colGrade, y)
      y += tH(7 * S) + 8 * S

      // Header separator
      ctx.strokeStyle = "rgba(0,0,0,0.10)"
      ctx.lineWidth = S
      ctx.beginPath(); ctx.moveTo(0, y - 4 * S); ctx.lineTo(CW, y - 4 * S); ctx.stroke()

      // Rows
      for (const s of subjects) {
        const excluded = !!s.excludeFromGWA
        const gradeBg = excluded ? "rgba(0,0,0,0.07)" : gradeColor(s.grade)
        const rowTH = tH(9 * S)
        const textY = Math.round(y + (ROW_H - rowTH) / 2)
        const pillTop = Math.round(y + (ROW_H - PILL_H) / 2)

        noShadow()
        ctx.fillStyle = gradeBg
        ctx.fillRect(colGrade - PILL_W / 2, pillTop, PILL_W, PILL_H)

        ctx.font = `600 ${9 * S}px ${FONT}`
        ctx.textAlign = "left"
        ctx.fillStyle = excluded ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.85)"
        drawText(s.code + (excluded ? " ·" : ""), colSubj, textY)

        ctx.textAlign = "center"
        ctx.fillStyle = excluded ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.85)"
        drawText(String(s.units), colUnits, textY)

        ctx.font = `600 ${9 * S}px ${FONT}`
        ctx.fillStyle = excluded ? "rgba(0,0,0,0.25)" : "#fff"
        drawText(s.gradeLabel || (s.grade === 0 ? "—" : s.grade.toFixed(2)), colGrade, textY)

        y += ROW_H
      }

      // Disclaimer with logo
      const dLogoSize = 10 * S
      const dLineH2 = Math.max(dLogoSize, tH(6 * S))
      const dBaseY2 = y + 10 * S
      if (logoImg) {
        ctx.filter = "brightness(0)"
        ctx.globalAlpha = 0.3
        ctx.drawImage(logoImg, colSubj, dBaseY2 + (dLineH2 - dLogoSize) / 2, dLogoSize, dLogoSize)
        ctx.filter = "none"
        ctx.globalAlpha = 1
      }
      ctx.font = `400 ${6 * S}px ${FONT}`
      ctx.fillStyle = "rgba(0,0,0,0.30)"
      ctx.textAlign = "left"
      drawText("For reference only. Verify with OUR.", colSubj + (logoImg ? dLogoSize + 3 * S : 0), dBaseY2 + (dLineH2 - tH(6 * S)) / 2)

    } else {
      // ── Single-column centered layout ──────────────────────────────────
      const BADGE_H = 20 * S

      // Measure widest elements to compute tight canvas width
      canvas.width = 4000
      const mW = (text: string, font: string) => { ctx.font = font; return ctx.measureText(text).width }
      const badgeLabel = badge ? displayScholar(badge as any).toUpperCase() : ""
      const latinLabel = latinBadge ? displayLatin(latinBadge).toUpperCase() : ""
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

      const footerH = 6 * S + 28 * S + 4 * S
      const widths = [
        showTermGWA && badge ? mW(badgeLabel, `600 ${9 * S}px ${FONT}`) + 2 * PAD + 32 * S : 0,
        showCumGWA && latinBadge ? mW(latinLabel, `600 ${9 * S}px ${FONT}`) + 2 * PAD + 32 * S : 0,
        showTermGWA ? mW(selectedKey, `400 ${11 * S}px ${FONT}`) + 2 * PAD : 0,
        showTermGWA ? mW(term.gwa.toFixed(4), `700 ${42 * S}px ${FONT}`) + 2 * PAD : 0,
        showCumGWA ? mW(cumulative.gwa > 0 ? cumulative.gwa.toFixed(4) : "—", `700 ${42 * S}px ${FONT}`) + 2 * PAD : 0,
      ]
      const CW = Math.ceil(Math.max(220 * S, ...widths))
      const totalH = Math.max(240 * S, contentH + footerH + 28 * S)

      canvas.width = CW
      canvas.height = Math.ceil(totalH)
      ctx.clearRect(0, 0, CW, canvas.height)
      ctx.textBaseline = "top"

      // Center the whole block (content + footer) in the canvas
      let y = Math.round((canvas.height - contentH - footerH) / 2)
      if (y < 24 * S) y = 24 * S

      const CX = CW / 2
      const CPAD = PAD


      ctx.shadowColor = showShadow ? "rgba(0,0,0,0.22)" : "transparent"
      ctx.shadowBlur = showShadow ? 14 * S : 0
      ctx.shadowOffsetY = 0
      ctx.textAlign = "center"
      ctx.fillStyle = "#fff"

      if (showTermGWA) {
        ctx.font = `600 ${9 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText("TERM GWA", CX, y); y += tH(9 * S) + 6 * S

        ctx.font = `700 ${11 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText(selectedKey, CX, y); y += tH(11 * S) + 8 * S

        ctx.font = `700 ${42 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText(fmt(term.gwa), CX, y); y += tH(42 * S) + 6 * S

        ctx.font = `500 ${9 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText(`${Math.round(term.units)} UNITS`, CX, y); y += tH(9 * S) + 12 * S

        if (badge) {
          noShadow()
          const sbW = CW - CPAD * 2
          let sbFs = 9 * S
          ctx.font = `700 ${sbFs}px ${FONT}`
          ctx.letterSpacing = `${0.6 * S}px`
          while (ctx.measureText(badgeLabel).width > sbW - 28 * S && sbFs > 5 * S) {
            sbFs -= S
            ctx.font = `700 ${sbFs}px ${FONT}`
          }
          ctx.letterSpacing = "0px"
          const sbC = document.createElement("canvas")
          sbC.width = sbW; sbC.height = BADGE_H
          const sbX = sbC.getContext("2d")!
          sbX.textBaseline = "top"
          sbX.fillStyle = "rgba(255,255,255,0.92)"
          sbX.fillRect(0, 0, sbW, BADGE_H)
          sbX.font = `700 ${sbFs}px ${FONT}`
          sbX.letterSpacing = `${0.6 * S}px`
          sbX.globalCompositeOperation = "destination-out"
          sbX.fillStyle = "rgba(0,0,0,1)"
          sbX.strokeStyle = "rgba(0,0,0,1)"
          sbX.lineWidth = S * 0.6
          sbX.textAlign = "center"
          const sbTY = (BADGE_H - tH(sbFs)) / 2
          sbX.strokeText(badgeLabel, sbW / 2, sbTY)
          sbX.fillText(badgeLabel, sbW / 2, sbTY)
          ctx.drawImage(sbC, CPAD, y)
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
        ctx.shadowColor = showShadow ? "rgba(0,0,0,0.22)" : "transparent"
        ctx.shadowBlur = showShadow ? 14 * S : 0
        ctx.shadowOffsetY = 0
      }

      if (showCumGWA) {
        ctx.shadowColor = showShadow ? "rgba(0,0,0,0.22)" : "transparent"
        ctx.shadowBlur = showShadow ? 14 * S : 0
        ctx.shadowOffsetY = 0
        ctx.font = `600 ${9 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText("CUMULATIVE GWA", CX, y); y += tH(9 * S) + 6 * S

        ctx.font = `700 ${42 * S}px ${FONT}`
        ctx.fillStyle = "#fff"
        drawText(cumulative.gwa > 0 ? fmt(cumulative.gwa) : "—", CX, y)
        y += tH(42 * S) + 6 * S

        if (cumulative.units > 0) {
          ctx.font = `500 ${9 * S}px ${FONT}`
          ctx.fillStyle = "#fff"
          drawText(`${Math.round(cumulative.units)} TOTAL UNITS`, CX, y)
          y += tH(9 * S) + 8 * S
        }

        if (latinBadge) {
          noShadow()
          const slW = CW - CPAD * 2
          let slFs = 9 * S
          ctx.font = `700 ${slFs}px ${FONT}`
          ctx.letterSpacing = `${0.6 * S}px`
          while (ctx.measureText(latinLabel).width > slW - 28 * S && slFs > 6 * S) {
            slFs -= S
            ctx.font = `700 ${slFs}px ${FONT}`
          }
          ctx.letterSpacing = "0px"
          const slC = document.createElement("canvas")
          slC.width = slW; slC.height = BADGE_H
          const slX = slC.getContext("2d")!
          slX.textBaseline = "top"
          slX.fillStyle = "rgba(255,255,255,0.92)"
          slX.fillRect(0, 0, slW, BADGE_H)
          slX.font = `700 ${slFs}px ${FONT}`
          slX.letterSpacing = `${0.6 * S}px`
          slX.globalCompositeOperation = "destination-out"
          slX.fillStyle = "rgba(0,0,0,1)"
          slX.strokeStyle = "rgba(0,0,0,1)"
          slX.lineWidth = S * 0.6
          slX.textAlign = "center"
          const slTY = (BADGE_H - tH(slFs)) / 2
          slX.strokeText(latinLabel, slW / 2, slTY)
          slX.fillText(latinLabel, slW / 2, slTY)
          ctx.drawImage(slC, CPAD, y)
          y += BADGE_H
        }
      }

      // Logo below content
      if (logoImg) {
        const logoSize = 28 * S
        noShadow()
        ctx.globalAlpha = 1
        const logoGap = (showTermGWA && !showCumGWA && !badge) ? 2 * S : 6 * S
        ctx.drawImage(logoImg, CX - logoSize / 2, y + logoGap, logoSize, logoSize)
        ctx.globalAlpha = 1
      }

    }

    return canvas
  }

  // ── Regenerate preview whenever options change ───────────────────────────
  useEffect(() => {
    const canvas = buildCanvas()
    if (!canvas) { setPreviewUrl(""); return }
    setPreviewUrl(canvas.toDataURL("image/png"))
  }, [selectedKey, includeTable, showTermGWA, showCumGWA, showScholar, showLatin, redactGWA, showShadow, term, cumulative.gwa, logoImg])

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
      } catch {
        setCopying(false)
      }
    }, "image/png")
  }

  return (
    <div
      className="pointer-events-auto flex items-center justify-center"
      style={{ position: "fixed", inset: 0, zIndex: 2147483648, background: "rgba(0,0,0,0.5)", animation: "gwa-fade 0.15s ease-out both" }}>

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
              className="w-full h-8 rounded-md border border-gray-200 bg-white px-2 pr-7 py-1 text-sm text-gray-800 appearance-none transition-colors hover:border-gray-300 hover:bg-gray-50 focus:border-upb-green/40 focus:outline-none focus:ring-1 focus:ring-upb-green/20 cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}>
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
            {(() => {
              const scholarDisabled = !showTermGWA || !scholar?.status
              return (
                <label className={`flex items-center gap-3 pl-8 pr-3 py-2.5 transition-colors ${scholarDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}`}>
                  <input type="checkbox" checked={showScholar} onChange={(e) => setShowScholar(e.target.checked)} className="accent-upb-green" disabled={scholarDisabled} />
                  <span className="text-xs text-gray-700 flex-1">Show scholar status badge</span>
                  {showTermGWA && !scholar?.status && (
                    <span className="text-[10px] text-gray-400 italic">not qualified</span>
                  )}
                </label>
              )
            })()}
            <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="checkbox" checked={showCumGWA} onChange={(e) => setShowCumGWA(e.target.checked)} className="accent-upb-green" />
              <span className="text-xs text-gray-700">Show cumulative GWA</span>
            </label>
            {(() => {
              const latinDisabled = !showCumGWA || !latinHonor
              return (
                <label className={`flex items-center gap-3 pl-8 pr-3 py-2.5 transition-colors ${latinDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}`}>
                  <input type="checkbox" checked={showLatin} onChange={(e) => setShowLatin(e.target.checked)} className="accent-upb-green" disabled={latinDisabled} />
                  <span className="text-xs text-gray-700 flex-1">Show latin honor estimate</span>
                  {showCumGWA && !latinHonor && (
                    <span className="text-[10px] text-gray-400 italic">not qualified</span>
                  )}
                </label>
              )
            })()}
            {(() => {
              const redactDisabled = !showTermGWA && !showCumGWA
              return (
                <label className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${redactDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}`}>
                  <input type="checkbox" checked={redactGWA} onChange={(e) => setRedactGWA(e.target.checked)} className="accent-upb-green" disabled={redactDisabled} />
                  <span className="text-xs text-gray-700 flex-1">Redact GWA</span>
                  <span className="text-[10px] text-gray-400 italic">shows 1.xx / 2.xx</span>
                </label>
              )
            })()}
            {(() => {
              const shadowDisabled = (!showTermGWA && !showCumGWA) || includeTable
              return (
                <label className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${shadowDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}`}>
                  <input type="checkbox" checked={showShadow} onChange={(e) => setShowShadow(e.target.checked)} className="accent-upb-green" disabled={shadowDisabled} />
                  <span className="text-xs text-gray-700 flex-1">Text shadow on GWA</span>
                  <span className="text-[10px] text-gray-400 italic">GWA only</span>
                </label>
              )
            })()}
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

          <p className="text-[10px] text-gray-400">For reference only. Official academic records must be verified with the Office of the University Registrar (OUR).</p>
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
