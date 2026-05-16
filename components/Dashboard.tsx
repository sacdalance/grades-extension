import { useState, useEffect } from "react"
import { getScholarStatus, getLatinHonor, displayScholar, displayLatin } from "~utils/honors"
import { Button } from "~components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~components/ui/card"
import { Separator } from "~components/ui/separator"
import { ContactModal } from "~components/ContactModal"
import { ProjectionModal } from "~components/ProjectionModal"
import { WhatIfModal } from "~components/WhatIfModal"
import { TermsModal } from "~components/TermsModal"
import type { CurrentData, Term } from "~types"

interface Props {
  current: CurrentData
  cumulative: { units: number; gwa: number }
  savedTerms: Record<string, Term>
  termOrder: string[]
  graduationUnits: number
  onSaveTotalUnits: (units: number) => void
  status: string
  saveState: "new" | "saved" | "update"
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

export function Dashboard({ current, cumulative, graduationUnits, onSaveTotalUnits, status, saveState, onSave, onManage }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [isCollapsing, setIsCollapsing] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [shouldAnimate, setShouldAnimate] = useState(true)
  const [projectOpen, setProjectOpen] = useState(false)
  const [whatIfOpen, setWhatIfOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)

  const scholar = getScholarStatus(current.gwa, current.units, current.subjects)
  const latinHonor = getLatinHonor(cumulative.gwa)

  useEffect(() => {
    if (!shouldAnimate) return
    const t = setTimeout(() => setShouldAnimate(false), 300)
    return () => clearTimeout(t)
  }, [shouldAnimate])

  const handleCollapse = () => {
    setIsCollapsing(true)
    setTimeout(() => {
      setCollapsed(true)
      setIsCollapsing(false)
      setShouldAnimate(false)
    }, 200)
  }

  const WIDGET_STYLE: React.CSSProperties = {
    position: "fixed",
    top: "4.5rem",
    right: "0.5rem",
    zIndex: 2147483647,
    width: "min(17rem, calc(100vw - 0.75rem))",
    pointerEvents: "auto",
    animation: isCollapsing 
      ? "gwa-slide-out 0.2s ease-in both"
      : shouldAnimate ? "gwa-slide-right 0.22s ease-out both" : undefined
  }

  const handleExpand = () => {
    setShouldAnimate(true)
    setCollapsed(false)
  }

  if (collapsed) {
    return (
      <div style={{ position: "fixed", right: 0, top: "50%", transform: "translateY(-50%)", zIndex: 2147483647, pointerEvents: "auto" }}>
        <button
          onClick={handleExpand}
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          className="inline-flex items-center gap-2 rounded-l-md bg-upb-green px-2 py-3 text-white shadow-md hover:bg-upb-green/90 transition-colors text-xs font-medium">
          GinaGWA mo?!
        </button>
      </div>
    )
  }

  return (
    <div style={WIDGET_STYLE}>
      <Card className="overflow-hidden shadow-md">

        <CardHeader className="bg-upb-green px-5 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <img src={chrome.runtime.getURL("assets/l-logo-white.png")} alt="" className="h-5 w-5 object-contain" />
              <CardTitle className="text-white text-sm tracking-wide">GinaGWA mo?!</CardTitle>
            </div>
            <button 
              onClick={handleCollapse} 
              className="h-6 w-6 flex items-center justify-center rounded text-white/70 hover:text-white hover:bg-white/20 transition-colors text-lg leading-none">
              ×
            </button>
          </div>
        </CardHeader>

        {/* Scholar banner */}
        {scholar.status && (
          <div className={`flex items-center justify-between px-5 py-1.5 border-l-4 ${
            scholar.status === "University Scholar" ? "bg-green-600/10 border-green-600"
            : "bg-green-800/10 border-green-800"
          }`}>
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${
              scholar.status === "University Scholar" ? "text-green-700" : "text-green-800"
            }`}>{displayScholar(scholar.status)}</span>
            <span className={`text-[10px] tabular-nums opacity-60 ${
              scholar.status === "University Scholar" ? "text-green-700" : "text-green-800"
            }`}>{current.gwa.toFixed(4)}</span>
          </div>
        )}

        <CardContent className="space-y-3 pt-3 pb-3">
          {/* Current term */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-upb-maroon uppercase tracking-widest">
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
              <StatBox label="Units" value={Math.round(current.units).toString()} />
              <StatBox label="GWA" value={current.gwa > 0 ? current.gwa.toFixed(4) : "0.0000"} />
            </div>

            {current.gwa > 0 && (
              <div className="space-y-2">
                {!scholar.status && scholar.reason && (
                  <p className="text-xs text-gray-400">{scholar.reason}</p>
                )}

                <Button
                  variant={saveState === "update" ? "danger" : "default"}
                  className="w-full flex-col h-auto py-1.5"
                  onClick={onSave}
                  disabled={saveState === "saved"}>
                  {saveState === "update" ? (
                    <>
                      <span>Revert Saved Term</span>
                      <span className="text-[10px] opacity-70 font-normal">{current.term}</span>
                    </>
                  ) : saveState === "saved" ? (
                    <>
                      <span>Already Saved</span>
                      <span className="text-[10px] opacity-70 font-normal">{current.term}</span>
                    </>
                  ) : "Save Term"}
                </Button>
              </div>
            )}

            {current.units === 0 && (
              <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-400">{status}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Latin honors banner */}
          {latinHonor && (
            <div className={`flex items-center justify-between px-5 py-1.5 -mx-4 border-l-4 ${
              latinHonor === "Summa Cum Laude" ? "bg-green-500/10 border-green-500"
              : latinHonor === "Magna Cum Laude" ? "bg-green-800/10 border-green-800"
              : "bg-gray-200 border-gray-500"
            }`}>
              <span className={`text-[10px] font-semibold uppercase tracking-widest ${
                latinHonor === "Summa Cum Laude" ? "text-green-600"
                : latinHonor === "Magna Cum Laude" ? "text-green-800"
                : "text-gray-600"
              }`}>{displayLatin(latinHonor)}</span>
              <span className={`text-[10px] tabular-nums opacity-60 ${
                latinHonor === "Summa Cum Laude" ? "text-green-600"
                : latinHonor === "Magna Cum Laude" ? "text-green-800"
                : "text-gray-600"
              }`}>{cumulative.gwa.toFixed(4)}</span>
            </div>
          )}

          {/* Cumulative */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-upb-maroon uppercase tracking-widest">
              Cumulative GWA
            </p>
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Units" value={Math.round(cumulative.units).toString()} />
              <StatBox label="GWA" value={cumulative.gwa > 0 ? cumulative.gwa.toFixed(4) : "0.0000"} />
            </div>
            {cumulative.gwa > 0 && !latinHonor && (
              <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-400">No latin honors yet. Need cumulative GWA ≤ 1.75</p>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex-col pt-0 pb-5 px-5">
          <div className="flex w-full gap-2">
            <Button className="flex-1 bg-upb-green hover:bg-upb-green/90 h-10 shadow-sm font-semibold" onClick={() => setProjectOpen(true)} disabled={cumulative.gwa === 0}>
              Project Latin Honors
            </Button>
            <Button className="h-10 px-3 shrink-0 bg-gray-900 hover:bg-gray-800 text-white" onClick={() => setWhatIfOpen(true)} disabled={cumulative.gwa === 0}>
              What-If
            </Button>
          </div>

          <div className="w-full h-px bg-gray-100 my-3" />

          <div className="flex w-full gap-3">
            <Button className="flex-1" variant="secondary" onClick={onManage}>
              Manage Data
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => setContactOpen(true)}>
              Contact
            </Button>
          </div>

          <p className="text-[10px] text-gray-400 text-center w-full mt-3 px-2 leading-relaxed">
            Unofficial estimate. INC/DRP may not reflect correctly.
            Always verify with the OUR.{" "}
            <button onClick={() => setTermsOpen(true)} className="underline hover:text-gray-600 transition-colors">Terms of Use</button>
          </p>
        </CardFooter>
      </Card>
      
      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}
      {termsOpen && <TermsModal onClose={() => setTermsOpen(false)} />}

      {whatIfOpen && (
        <WhatIfModal
          currentGWA={cumulative.gwa}
          currentUnits={cumulative.units}
          totalUnits={graduationUnits}
          onSaveTotalUnits={onSaveTotalUnits}
          onClose={() => setWhatIfOpen(false)}
        />
      )}
      
      {projectOpen && (
        <ProjectionModal
          currentGWA={cumulative.gwa}
          currentUnits={cumulative.units}
          totalUnits={graduationUnits}
          onClose={() => setProjectOpen(false)}
          onSaveTotalUnits={onSaveTotalUnits}
        />
      )}
    </div>
  )
}
