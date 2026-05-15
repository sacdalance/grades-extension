import { useState, useEffect } from "react"
import { getScholarStatus, getLatinHonor, displayScholar, displayLatin } from "~utils/honors"
import { Button } from "~components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~components/ui/card"
import { Separator } from "~components/ui/separator"
import { ContactModal } from "~components/ContactModal"
import type { CurrentData } from "~types"

interface Props {
  current: CurrentData
  cumulative: { units: number; gwa: number }
  status: string
  termAlreadySaved: boolean
  onSave: () => void
  onManage: () => void
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-upb-green/5 border border-upb-green/10 px-3 py-2.5 text-center">
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-xl font-semibold text-upb-green tabular-nums leading-none">{value}</span>
    </div>
  )
}

export function Dashboard({ current, cumulative, status, termAlreadySaved, onSave, onManage }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [shouldAnimate, setShouldAnimate] = useState(true)

  const scholar = getScholarStatus(current.gwa, current.units, current.subjects)
  const latinHonor = getLatinHonor(cumulative.gwa)

  useEffect(() => {
    if (!shouldAnimate) return
    const t = setTimeout(() => setShouldAnimate(false), 300)
    return () => clearTimeout(t)
  }, [shouldAnimate])

  const handleCollapse = () => {
    setShouldAnimate(true)
    setCollapsed(true)
  }

  const WIDGET_STYLE: React.CSSProperties = {
    position: "fixed",
    top: "4.5rem",
    right: "1.25rem",
    zIndex: 2147483647,
    width: "min(17rem, calc(100vw - 1rem))",
    pointerEvents: "auto",
    animation: shouldAnimate ? "gwa-slide-right 0.22s ease-out both" : undefined
  }

  if (collapsed) {
    return (
      <div style={{ position: "fixed", right: 0, top: "50%", transform: "translateY(-50%)", zIndex: 2147483647, pointerEvents: "auto" }}>
        <button
          onClick={() => setCollapsed(false)}
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          className="inline-flex items-center gap-2 rounded-l-md bg-upb-green px-2 py-3 text-white shadow-md hover:bg-upb-green/90 transition-colors text-xs font-medium">
          GWA Calculator
          {current.gwa > 0 && (
            <span className="border border-white/30 rounded px-1 tabular-nums text-[10px]">
              {current.gwa.toFixed(4)}
            </span>
          )}
        </button>
      </div>
    )
  }

  return (
    <div style={WIDGET_STYLE}>
      <Card className="overflow-hidden shadow-md">

        <CardHeader className="bg-upb-green px-5 py-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-white text-sm tracking-wide">AMIS GWA Calculator</CardTitle>
            <Button variant="icon" size="icon" onClick={handleCollapse} className="text-white/70 hover:text-white">×</Button>
          </div>
        </CardHeader>

        {/* Scholar banner */}
        {scholar.status && (
          <div className={`flex items-center justify-between px-5 py-1.5 ${scholar.status === "University Scholar" ? "bg-upb-green/90" : scholar.status === "Academic Achiever" ? "bg-upb-gold" : "bg-upb-maroon"}`}>
            <span className="text-[10px] font-semibold text-white uppercase tracking-widest">{displayScholar(scholar.status)}</span>
            <span className="text-[10px] text-white/60 tabular-nums">{current.gwa.toFixed(4)}</span>
          </div>
        )}

        <CardContent className="space-y-3 pt-3">
          {/* Current term */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-upb-maroon uppercase tracking-widest border-l-2 border-upb-maroon pl-2">
              Term GWA
            </p>

            {status === "No grades table found." && (
              <ol className="text-[10px] text-gray-400 space-y-0.5 pl-2 list-decimal list-inside leading-relaxed">
                <li>Click your name in the top bar <span className="text-gray-500 italic">(e.g. Lance Gabriel)</span></li>
                <li>Select <span className="font-medium text-gray-500">Grades</span></li>
                <li>Choose a term to load your grades <span className="text-gray-500 italic">(e.g. First Semester 2024-2025)</span></li>
              </ol>
            )}

            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Units" value={current.units > 0 ? Math.round(current.units).toString() : "—"} />
              <StatBox label="GWA" value={current.gwa > 0 ? current.gwa.toFixed(4) : "—"} />
            </div>

            {current.gwa > 0 && (
              <div className="space-y-2">
                {!scholar.status && (
                  <p className="text-xs text-gray-400">
                    {scholar.disqualified ? scholar.reason : scholar.reason ?? "Not qualified this term"}
                  </p>
                )}

                <Button className="w-full flex-col h-auto py-1.5" onClick={onSave} disabled={termAlreadySaved}>
                  {termAlreadySaved ? (
                    <>
                      <span>Already Saved</span>
                      <span className="text-[10px] opacity-70 font-normal">{current.term}</span>
                    </>
                  ) : "Save Term"}
                </Button>
              </div>
            )}

            {current.units === 0 && (
              <div className="rounded-md border border-upb-maroon/20 bg-upb-maroon/5 px-3 py-2">
                <p className="text-xs text-upb-maroon">{status}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Latin honors banner */}
          {latinHonor && (
            <div className="flex items-center justify-between bg-upb-maroon -mx-4 px-5 py-1.5">
              <span className="text-[10px] font-semibold text-white uppercase tracking-widest">{displayLatin(latinHonor)}</span>
              <span className="text-[10px] text-white/60 tabular-nums">{cumulative.gwa.toFixed(4)}</span>
            </div>
          )}

          {/* Cumulative */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-upb-maroon uppercase tracking-widest border-l-2 border-upb-maroon pl-2">
              Cumulative GWA
            </p>
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Units" value={cumulative.units > 0 ? Math.round(cumulative.units).toString() : "—"} />
              <StatBox label="GWA" value={cumulative.gwa > 0 ? cumulative.gwa.toFixed(4) : "—"} />
            </div>
            {cumulative.gwa > 0 && !latinHonor && (
              <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-400">No latin honors yet — need GWA ≤ 1.75</p>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-1.5 pt-0">
          <Separator className="mb-1" />
          <div className="flex w-full gap-2">
            <Button className="flex-1" variant="secondary" onClick={onManage}>
              Manage Data
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => setContactOpen(true)}>
              Contact
            </Button>
          </div>
          <p className="text-[10px] text-gray-400 text-center w-full mt-1">
            INC grades not detected — verify with OUR
          </p>
        </CardFooter>
      </Card>
      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}
    </div>
  )
}
