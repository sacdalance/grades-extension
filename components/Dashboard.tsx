import { useState, useEffect } from "react"
import { getScholarStatus, getLatinHonor, displayScholar, displayLatin } from "~utils/honors"
import { Button } from "~components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~components/ui/card"
import { Separator } from "~components/ui/separator"
import { ContactModal } from "~components/ContactModal"
import { ProjectionModal } from "~components/ProjectionModal"
import { WhatIfModal } from "~components/WhatIfModal"
import { TermsModal } from "~components/TermsModal"
import type { CurrentData, Term, WhatIfTerm } from "~types"

interface Props {
  current: CurrentData
  cumulative: { units: number; gwa: number }
  savedTerms: Record<string, Term>
  graduationUnits: number
  onSaveTotalUnits: (units: number) => void
  status: string
  saveState: "new" | "saved" | "update"
  onSave: () => void
  onManage: () => void
  onScanAll: (onProgress: (current: string, done: number, total: number) => void) => Promise<import("~types").CurrentData[]>
  onSaveScan: (results: import("~types").CurrentData[]) => Promise<number>
  whatIfTerms: WhatIfTerm[]
  onSaveWhatIfTerms: (terms: WhatIfTerm[]) => Promise<void>
}

type ScanPhase = "confirm" | "scanning" | "conflicts" | "done"

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-upb-green/5 border border-upb-green/10 px-3 py-2.5 text-center">
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-xl font-semibold text-upb-green tabular-nums leading-none">{value}</span>
    </div>
  )
}

export function Dashboard({ current, cumulative, savedTerms, graduationUnits, onSaveTotalUnits, status, saveState, onSave, onManage, onScanAll, onSaveScan, whatIfTerms, onSaveWhatIfTerms }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [isCollapsing, setIsCollapsing] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [shouldAnimate, setShouldAnimate] = useState(true)
  const [projectOpen, setProjectOpen] = useState(false)
  const [whatIfOpen, setWhatIfOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [noDataOpen, setNoDataOpen] = useState(false)

  // Scan modal state
  const [scanPhase, setScanPhase] = useState<ScanPhase | null>(null)
  const [scanProgress, setScanProgress] = useState<{ current: string; done: number; total: number }>({ current: "", done: 0, total: 0 })
  const [scanResults, setScanResults] = useState<{
    toAdd: CurrentData[]
    conflicts: { term: string; oldGwa: number; newGwa: number; data: CurrentData }[]
  } | null>(null)
  const [scanSummary, setScanSummary] = useState("")

  const [canScan, setCanScan] = useState(() => !!document.querySelector(".vs__search"))

  useEffect(() => {
    const check = () => setCanScan(!!document.querySelector(".vs__search"))
    check()
    let timer: ReturnType<typeof setTimeout> | null = null
    const observer = new MutationObserver(() => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(check, 300)
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => { observer.disconnect(); if (timer) clearTimeout(timer) }
  }, [])

  const showToast = (msg: string, duration = 4000) => {
    setToast(msg)
    setTimeout(() => setToast(null), duration)
  }

  useEffect(() => {
    if (status && (status.startsWith("Saved") || status.startsWith("Updated"))) {
      showToast(status)
    }
  }, [status])

  const runScan = async () => {
    setScanPhase("scanning")
    setScanProgress({ current: "", done: 0, total: 0 })
    setScanResults(null)
    try {
      const results = await onScanAll((cur, done, total) => {
        setScanProgress({ current: cur, done, total })
      })
      const toAdd = results.filter(r => !savedTerms[r.term])
      const conflicts = results
        .filter(r => !!savedTerms[r.term])
        .map(r => ({ term: r.term, oldGwa: savedTerms[r.term].gwa, newGwa: r.gwa, data: r }))

      if (conflicts.length === 0) {
        const saved = await onSaveScan(toAdd)
        setScanSummary(saved > 0 ? `Imported ${saved} term${saved !== 1 ? "s" : ""} from AMIS.` : "No new terms found.")
        setScanPhase("done")
      } else {
        setScanResults({ toAdd, conflicts })
        setScanPhase("conflicts")
      }
    } catch {
      setScanSummary("Something went wrong. Please try again.")
      setScanPhase("done")
    }
  }

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
    width: "min(20rem, calc(100vw - 0.75rem))",
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
          <div className={`flex items-center justify-between px-5 py-1.5 border-l-4 ${scholar.status === "University Scholar" ? "bg-green-600/10 border-green-600"
            : "bg-green-800/10 border-green-800"
            }`}>
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${scholar.status === "University Scholar" ? "text-green-700" : "text-green-800"
              }`}>{displayScholar(scholar.status)}</span>
            <span className={`text-[10px] tabular-nums opacity-60 ${scholar.status === "University Scholar" ? "text-green-700" : "text-green-800"
              }`}>{current.gwa.toFixed(4)}</span>
          </div>
        )}

        <CardContent className="space-y-3 pt-3 pb-3">
          {/* Current term */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-upb-maroon uppercase tracking-widest">
              Term GWA
            </p>

            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Units" value={Math.round(current.units).toString()} />
              <StatBox label="GWA" value={current.gwa > 0 ? current.gwa.toFixed(4) : "0.0000"} />
            </div>

            {!scholar.status && scholar.reason && current.gwa > 0 && (
              <p className="text-xs text-gray-400">{scholar.reason}</p>
            )}

            <div className="space-y-1">
              <div className="border-l-2 border-upb-green/30 pl-2">
                <p className="text-[10px] text-gray-400 leading-relaxed"><span className="font-medium text-gray-500">Scan AMIS</span> - automatically imports all your terms at once.</p>
              </div>
              <div className="border-l-2 border-upb-green/30 pl-2">
                <p className="text-[10px] text-gray-400 leading-relaxed"><span className="font-medium text-gray-500">Save Term</span> - saves only the term selected in the dropdown.</p>
              </div>
              <p className="text-[10px] text-gray-400 pl-0.5">Must be on the <span className="font-medium text-gray-500">Grades</span> tab.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                className="bg-upb-green hover:bg-upb-green/90 text-white"
                onClick={() => setScanPhase("confirm")}>
                Scan AMIS
              </Button>

              <Button
                variant={saveState === "update" ? "danger" : "default"}
                onClick={() => setSaveConfirmOpen(true)}>
                {saveState === "update" ? "Update Term" : saveState === "saved" ? "Already Saved" : "Save Term"}
              </Button>
            </div>

            {saveState === "saved" && current.gwa > 0 && (
              <p className="text-[10px] text-gray-400 text-center">{current.term} already saved</p>
            )}

          </div>

          <Separator />

          {/* Latin honors banner */}
          {latinHonor && (
            <div className={`flex items-center justify-between px-5 py-1.5 -mx-4 border-l-4 ${latinHonor === "Summa Cum Laude" ? "bg-green-500/10 border-green-500"
              : latinHonor === "Magna Cum Laude" ? "bg-green-800/10 border-green-800"
                : "bg-gray-200 border-gray-500"
              }`}>
              <span className={`text-[10px] font-semibold uppercase tracking-widest ${latinHonor === "Summa Cum Laude" ? "text-green-600"
                : latinHonor === "Magna Cum Laude" ? "text-green-800"
                  : "text-gray-600"
                }`}>{displayLatin(latinHonor)}</span>
              <span className={`text-[10px] tabular-nums opacity-60 ${latinHonor === "Summa Cum Laude" ? "text-green-600"
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
            <div className="grid grid-cols-3 gap-2">
              <Button className="col-span-2 bg-upb-green hover:bg-upb-green/90 font-semibold text-xs" onClick={() => cumulative.gwa === 0 ? setNoDataOpen(true) : setProjectOpen(true)}>
                Project Latin Honors
              </Button>
              <Button className="col-span-1 bg-gray-900 hover:bg-gray-800 text-white text-xs" onClick={() => cumulative.gwa === 0 ? setNoDataOpen(true) : setWhatIfOpen(true)}>
                What-If
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex-col pt-0 pb-5 px-5">
          <div className="w-full h-px bg-gray-100 mb-3" />

          <div className="grid grid-cols-2 gap-2 w-full">
            <Button onClick={onManage}>
              Manage Data
            </Button>
            <Button variant="secondary" onClick={() => setContactOpen(true)}>
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
          savedTerms={whatIfTerms}
          onSaveTerms={onSaveWhatIfTerms}
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

      {/* No data modal */}
      {noDataOpen && (
        <div
          className="pointer-events-auto flex items-center justify-center"
          style={{ position: "fixed", inset: 0, zIndex: 2147483648, background: "rgba(0,0,0,0.45)", animation: "gwa-fade 0.15s ease-out both" }}>
          <div
            className="bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
            style={{ width: "min(20rem, 92vw)", animation: "gwa-slide-up 0.2s ease-out both" }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">No data yet</p>
              <button onClick={() => setNoDataOpen(false)} className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none">×</button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="rounded-md bg-gray-50 border border-gray-100 px-3 py-2.5 space-y-1.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">What you need</p>
                <ol className="text-[11px] text-gray-600 space-y-0.5 list-decimal list-inside leading-relaxed">
                  <li>Go to the Grades tab on AMIS</li>
                  <li>Select a term to load your grades</li>
                  <li>Click <span className="font-medium">Save Term</span> or use <span className="font-medium">Scan AMIS</span></li>
                </ol>
              </div>
              <Button size="sm" className="w-full" onClick={() => setNoDataOpen(false)}>Got it</Button>
            </div>
          </div>
        </div>
      )}

      {/* Save confirm modal */}
      {saveConfirmOpen && (
        <div
          className="pointer-events-auto flex items-center justify-center"
          style={{ position: "fixed", inset: 0, zIndex: 2147483648, background: "rgba(0,0,0,0.45)", animation: "gwa-fade 0.15s ease-out both" }}>
          <div
            className="bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
            style={{ width: "min(20rem, 92vw)", animation: "gwa-slide-up 0.2s ease-out both" }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">
                {current.gwa === 0 ? "No data yet" : saveState === "saved" ? "Already saved" : saveState === "update" ? "Update saved term?" : "Save this term?"}
              </p>
              <button
                onClick={() => setSaveConfirmOpen(false)}
                className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none">
                ×
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {current.gwa === 0 ? (
                <>
                  <div className="rounded-md bg-gray-50 border border-gray-100 px-3 py-2.5 space-y-1.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">What you need</p>
                    <ol className="text-[11px] text-gray-600 space-y-0.5 list-decimal list-inside leading-relaxed">
                      <li>Go to the Grades tab on AMIS</li>
                      <li>Select a term from the dropdown</li>
                      <li>Come back and click <span className="font-medium">Save Term</span></li>
                    </ol>
                  </div>
                  <Button size="sm" className="w-full" onClick={() => setSaveConfirmOpen(false)}>Got it</Button>
                </>
              ) : saveState === "saved" ? (
                <>
                  <div className="rounded-md bg-gray-50 border border-gray-100 px-3 py-2.5 space-y-1">
                    <p className="text-[11px] font-medium text-gray-700 truncate">{current.term}</p>
                    <p className="text-[10px] text-gray-400">GWA <span className="font-medium text-upb-green">{current.gwa.toFixed(4)}</span> · {Math.round(current.units)} units</p>
                  </div>
                  <p className="text-[11px] text-gray-400">This term is already saved. Select a different term from the dropdown to save another.</p>
                  <Button size="sm" className="w-full" onClick={() => setSaveConfirmOpen(false)}>Got it</Button>
                </>
              ) : (
                <>
                  <div className="rounded-md bg-gray-50 border border-gray-100 px-3 py-2.5 space-y-1">
                    <p className="text-[11px] font-medium text-gray-700 truncate">{current.term}</p>
                    {saveState === "update" ? (
                      <p className="text-[10px] text-gray-400">
                        Saved: <span className="font-medium text-gray-600">{savedTerms[current.term]?.gwa.toFixed(4)}</span>
                        {" → "}
                        New: <span className="font-medium text-upb-green">{current.gwa.toFixed(4)}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-400">
                        GWA <span className="font-medium text-upb-green">{current.gwa.toFixed(4)}</span> · {Math.round(current.units)} units
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => setSaveConfirmOpen(false)}>Cancel</Button>
                    <Button
                      variant={saveState === "update" ? "danger" : "default"}
                      size="sm"
                      className="flex-1"
                      onClick={() => { setSaveConfirmOpen(false); onSave() }}>
                      {saveState === "update" ? "Update" : "Save"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scan AMIS modal */}
      {scanPhase !== null && (
        <div
          className="pointer-events-auto flex items-center justify-center"
          style={{ position: "fixed", inset: 0, zIndex: 2147483648, background: "rgba(0,0,0,0.45)", animation: "gwa-fade 0.15s ease-out both" }}>
          <div
            className="bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
            style={{ width: "min(22rem, 92vw)", animation: "gwa-slide-up 0.2s ease-out both" }}>

            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Scan AMIS</p>
              {(scanPhase === "confirm" || scanPhase === "done") && (
                <button
                  onClick={() => setScanPhase(null)}
                  className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none">
                  ×
                </button>
              )}
            </div>

            <div className="px-5 py-4 space-y-4">

              {/* Confirm phase */}
              {scanPhase === "confirm" && (
                <>
                  {!canScan && (
                    <div className="rounded-md bg-gray-50 border border-gray-100 px-3 py-2.5 space-y-1.5">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">What you need</p>
                      <ol className="text-[11px] text-gray-600 space-y-0.5 list-decimal list-inside leading-relaxed">
                        <li>Click your name in the top bar</li>
                        <li>Select <span className="font-medium">Grades</span></li>
                        <li>Come back and start the scan</li>
                      </ol>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    This will automatically go through all your terms and import your grades. Terms with different grades will be flagged for your review.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => setScanPhase(null)}>Cancel</Button>
                    <Button size="sm" className="flex-1" onClick={runScan} disabled={!canScan}>Start Scan</Button>
                  </div>
                </>
              )}

              {/* Scanning phase */}
              {scanPhase === "scanning" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full border-2 border-upb-green border-t-transparent animate-spin shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-600">
                        {scanProgress.total > 0 ? `Term ${scanProgress.done + 1} of ${scanProgress.total}` : "Looking for terms…"}
                      </p>
                      {scanProgress.total > 0 && scanProgress.current && (
                        <p className="text-[10px] text-gray-400 truncate">{scanProgress.current}</p>
                      )}
                    </div>
                  </div>
                  {scanProgress.total > 0 && (
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-upb-green transition-all duration-300"
                        style={{ width: `${((scanProgress.done + 1) / scanProgress.total) * 100}%` }}
                      />
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400">Please don't navigate away while scanning.</p>
                </div>
              )}

              {/* Conflicts phase */}
              {scanPhase === "conflicts" && scanResults && (
                <>
                  <p className="text-[11px] text-gray-500">
                    {scanResults.toAdd.length > 0 && (
                      <span className="text-upb-green font-medium">{scanResults.toAdd.length} new term{scanResults.toAdd.length !== 1 ? "s" : ""} ready to import. </span>
                    )}
                    <span className="font-medium text-gray-700">{scanResults.conflicts.length} term{scanResults.conflicts.length !== 1 ? "s" : ""}</span> already saved with different grades:
                  </p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {scanResults.conflicts.map(c => (
                      <div key={c.term} className="rounded-md bg-gray-50 border border-gray-100 px-3 py-2">
                        <p className="text-[11px] font-medium text-gray-700 truncate">{c.term}</p>
                        <p className="text-[10px] text-gray-400">
                          Saved: <span className="font-medium text-gray-600">{c.oldGwa.toFixed(4)}</span>
                          {" → "}
                          AMIS: <span className="font-medium text-upb-green">{c.newGwa.toFixed(4)}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={async () => {
                      const saved = await onSaveScan(scanResults.toAdd)
                      setScanSummary(saved > 0 ? `Imported ${saved} new term${saved !== 1 ? "s" : ""}. Conflicts skipped.` : "No new terms imported.")
                      setScanPhase("done")
                    }}>Skip Conflicts</Button>
                    <Button size="sm" className="flex-1" onClick={async () => {
                      const all = [...scanResults.toAdd, ...scanResults.conflicts.map(c => c.data)]
                      const saved = await onSaveScan(all)
                      setScanSummary(`Imported ${saved} term${saved !== 1 ? "s" : ""} from AMIS.`)
                      setScanPhase("done")
                    }}>Overwrite All</Button>
                  </div>
                </>
              )}

              {/* Done phase */}
              {scanPhase === "done" && (
                <>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{scanSummary}</p>
                  <Button className="w-full" size="sm" onClick={() => setScanPhase(null)}>Done</Button>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Bottom toast */}
      {toast && (
        <div
          className="pointer-events-none"
          style={{ position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", zIndex: 2147483649, animation: "gwa-slide-up 0.2s ease-out both" }}>
          <div className="bg-gray-900 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap max-w-xs text-center">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
