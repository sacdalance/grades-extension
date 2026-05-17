import { useState } from "react"
import { Settings } from "lucide-react"
import { Button } from "~components/ui/button"
import { calculateProjections, estimateFinalGWA } from "~utils/honors"
import type { Projection } from "~utils/honors"

interface Props {
  currentGWA: number
  currentUnits: number
  totalUnits: number
  onClose: () => void
  onSaveTotalUnits: (units: number) => void
  title?: string
}

export function SetupScreen({ totalUnits, onSave, onCancel }: { totalUnits: number; onSave: (v: number) => void; onCancel?: () => void }) {
  const [input, setInput] = useState(totalUnits > 0 ? String(totalUnits) : "")
  const parsed = parseInt(input)
  const valid = !!parsed && parsed >= 1 && parsed <= 250

  return (
    <div className="flex-1 px-5 py-5 space-y-4">
      <p className="text-xs text-gray-500 leading-relaxed">
        Enter your program's total required units to project latin honor eligibility.
      </p>
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Total Graduation Units</label>
        <input
          type="number"
          value={input}
          min={1}
          max={250}
          placeholder="e.g. 160"
          onChange={(e) => { const n = parseInt(e.target.value); setInput(n > 250 ? "250" : e.target.value) }}
          onKeyDown={(e) => e.key === "Enter" && valid && onSave(parsed)}
          className="w-full h-8 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 focus:outline-none focus:border-upb-green/40 focus:ring-1 focus:ring-upb-green/20 hover:border-gray-300"
        />
        <p className="text-[10px] text-gray-400">Typical UP programs: 155–170 units · Max: 250</p>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        {onCancel && <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>}
        <Button size="sm" disabled={!valid} onClick={() => onSave(parsed)}>Save</Button>
      </div>
    </div>
  )
}

const STATUS_STYLE: Record<string, string> = {
  guaranteed: "text-green-700 bg-green-50 border-green-200",
  impossible: "text-gray-400 bg-gray-50 border-gray-200",
  easy:       "text-emerald-700 bg-emerald-50 border-emerald-200",
  moderate:   "text-amber-700 bg-amber-50 border-amber-200",
  hard:       "text-orange-700 bg-orange-50 border-orange-200",
  extreme:    "text-rose-700 bg-rose-50 border-rose-200",
}
const BAR_COLOR: Record<string, string> = {
  guaranteed: "bg-green-500",
  impossible: "bg-gray-200",
  easy:       "bg-emerald-500",
  moderate:   "bg-amber-400",
  hard:       "bg-orange-500",
  extreme:    "bg-rose-500",
}
const STATUS_LABEL: Record<string, string> = {
  guaranteed: "Guaranteed",
  impossible: "Not Possible",
  easy:       "Possible (Easy)",
  moderate:   "Possible (Moderate)",
  hard:       "Possible (Hard)",
  extreme:    "Possible (Extreme)",
}

function getGradeMix(avg: number): string {
  if (avg <= 1.05) return "Need almost straight 1.00s"
  if (avg <= 1.25) return "Need mostly 1.00s and 1.25s"
  if (avg <= 1.50) return "Need mostly 1.25s and 1.50s"
  if (avg <= 1.75) return "Need mostly 1.50s and 1.75s"
  if (avg <= 2.00) return "Need a mix of 1.75s and 2.00s"
  if (avg <= 2.50) return "Need to maintain 2.00–2.50 avg"
  return "Need to maintain passing grades (3.00)"
}

function ProjectionRow({ p, currentGWA, remainingUnits }: { p: Projection; currentGWA: number; remainingUnits: number }) {
  // Bar shows how achievable the required future GWA is:
  // required = 1.00 (perfect) → 0% (very hard), required = 5.00 (worst) → 100% (easy/guaranteed)
  const barPct = p.status === "guaranteed" ? 100
    : p.status === "impossible" ? 0
    : Math.min(100, Math.max(0, ((p.requiredGWA! - 1.0) / 4.0) * 100))

  return (
    <div className="px-5 py-3.5 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-gray-800">{p.tier}</p>
          <p className="text-[10px] text-gray-400 tabular-nums">Target GWA ≤ {p.target.toFixed(2)}</p>
        </div>
        <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide border rounded px-1.5 py-0.5 ${STATUS_STYLE[p.difficulty || p.status]}`}>
          {STATUS_LABEL[p.difficulty || p.status]}
        </span>
      </div>

      {p.status === "possible" && p.requiredGWA !== null && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500">
            Need <span className="font-semibold text-gray-800 tabular-nums">{p.requiredGWA.toFixed(4)}</span> avg for remaining {Math.round(remainingUnits)} units
          </p>
          <p className="text-[10px] text-gray-400 italic">
            Tip: {getGradeMix(p.requiredGWA)}
          </p>
        </div>
      )}
      {p.status === "guaranteed" && (
        <p className="text-[10px] text-green-600">Maintainable even with lower grades ahead</p>
      )}
      {p.status === "impossible" && (
        <p className="text-[10px] text-gray-400">Out of reach with remaining units</p>
      )}

      <div className="space-y-1">
        <div className="relative h-1.5 rounded-full bg-gray-100">
          <div
            className={`absolute top-0 left-0 h-full rounded-full ${BAR_COLOR[p.difficulty || p.status]}`}
            style={{ width: `${barPct}%` }}
          />
          {p.status === "possible" && p.requiredGWA !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-white shadow-sm bg-gray-500"
              style={{ left: `calc(${barPct}% - 4px)` }}
            />
          )}
        </div>
        <div className="flex justify-between">
          <span className="text-[9px] text-gray-300 tabular-nums">1.00 ← harder</span>
          <span className="text-[9px] text-gray-300 tabular-nums">easier → 5.00</span>
        </div>
      </div>
    </div>
  )
}

export function ProjectionModal({ currentGWA, currentUnits, totalUnits, onClose, onSaveTotalUnits, title = "Latin Honor Projection" }: Props) {
  const [editing, setEditing] = useState(false)

  const projections = totalUnits > 0 ? calculateProjections(currentGWA, currentUnits, totalUnits) : []
  const remainingUnits = Math.max(0, totalUnits - currentUnits)
  const completedPct = totalUnits > 0 ? Math.min(100, Math.round((currentUnits / totalUnits) * 100)) : 0

  const bestCase = totalUnits > 0 ? estimateFinalGWA(currentGWA, currentUnits, totalUnits, 1.0) : 0
  const avgCase = totalUnits > 0 ? estimateFinalGWA(currentGWA, currentUnits, totalUnits, 2.0) : 0
  const worstCase = totalUnits > 0 ? estimateFinalGWA(currentGWA, currentUnits, totalUnits, 3.0) : 0
  const absoluteWorstCase = totalUnits > 0 ? estimateFinalGWA(currentGWA, currentUnits, totalUnits, 5.0) : 0

  const handleSave = (v: number) => {
    onSaveTotalUnits(v)
    setEditing(false)
  }

  return (
    <>
      {/* Main modal */}
      <div
        className="pointer-events-auto flex items-center justify-center"
        style={{ position: "fixed", inset: 0, zIndex: 2147483648, background: "rgba(0,0,0,0.4)", animation: "gwa-fade 0.15s ease-out both" }}>

        <div
          className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
          style={{ width: "min(28rem, 92vw)", maxHeight: "82vh", animation: "gwa-slide-up 0.2s ease-out both" }}>

          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            <div className="flex items-center gap-0.5">
              <Button variant="icon" size="icon" onClick={() => setEditing(true)}>
                <Settings size={13} />
              </Button>
              <Button variant="icon" size="icon" onClick={onClose} className="text-lg leading-none">×</Button>
            </div>
          </div>

          {totalUnits === 0 ? (
            <div className="flex-1 px-5 py-8 flex flex-col items-center justify-center text-center space-y-2">
              <p className="text-xs text-gray-500 leading-relaxed">Set your program's total required units to project latin honor eligibility.</p>
              <button onClick={() => setEditing(true)} className="text-xs font-medium text-upb-green hover:underline">Configure now →</button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {/* Context note */}
              <div className="px-5 py-3.5 border-b border-gray-100">
                <div className="pl-3 border-l-2 border-upb-green/30">
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Based on cumulative GWA <span className="font-medium text-gray-700 tabular-nums">{currentGWA.toFixed(4)}</span> over {Math.round(currentUnits)} units. Unofficial estimate.
                  </p>
                </div>
              </div>

              {/* Degree progress */}
              <div className="px-5 py-3.5 border-b border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Degree Progress</span>
                  <span className="text-[10px] font-semibold text-upb-green tabular-nums">{completedPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-upb-green" style={{ width: `${completedPct}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-gray-400 tabular-nums">{Math.round(currentUnits)} units done</span>
                  <span className="text-[10px] text-gray-400 tabular-nums">{Math.round(remainingUnits)} remaining of {totalUnits}</span>
                </div>
              </div>

              {/* Final GWA Outlook */}
              <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100">
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-2">Graduation Outlook</span>
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-white border border-gray-100 rounded p-2 text-center">
                    <p className="text-[9px] text-gray-400 uppercase font-medium">Best Case</p>
                    <p className="text-sm font-bold text-emerald-600 tabular-nums">{bestCase.toFixed(4)}</p>
                    <p className="text-[8px] text-gray-400 mt-0.5">(if all 1.00s)</p>
                  </div>
                  <div className="bg-white border border-gray-100 rounded p-2 text-center">
                    <p className="text-[9px] text-gray-400 uppercase font-medium">Average Case</p>
                    <p className="text-sm font-bold text-amber-500 tabular-nums">{avgCase.toFixed(4)}</p>
                    <p className="text-[8px] text-gray-400 mt-0.5">(if all 2.00s)</p>
                  </div>
                  <div className="bg-white border border-gray-100 rounded p-2 text-center">
                    <p className="text-[9px] text-gray-400 uppercase font-medium">Worst Case</p>
                    <p className="text-sm font-bold text-rose-600 tabular-nums">{worstCase.toFixed(4)}</p>
                    <p className="text-[8px] text-gray-400 mt-0.5">(if all 3.00s)</p>
                  </div>
                  <div className="bg-white border border-gray-100 rounded p-2 text-center">
                    <p className="text-[9px] text-gray-400 uppercase font-medium">Absolute Cinema</p>
                    <p className="text-sm font-bold text-gray-400 tabular-nums">{absoluteWorstCase.toFixed(4)}</p>
                    <p className="text-[8px] text-gray-400 mt-0.5">(if all 5.00s)</p>
                  </div>
                </div>
              </div>

              {/* Projection rows */}
              <div className="divide-y divide-gray-100">
                {projections.map((p) => (
                  <ProjectionRow key={p.tier} p={p} currentGWA={currentGWA} remainingUnits={remainingUnits} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings modal — separate overlay with its own animation */}
      {editing && (
        <div
          className="pointer-events-auto flex items-center justify-center"
          style={{ position: "fixed", inset: 0, zIndex: 2147483649, background: "rgba(0,0,0,0.4)", animation: "gwa-fade 0.15s ease-out both" }}>
          <div
            className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
            style={{ width: "min(22rem, 92vw)", animation: "gwa-slide-up 0.2s ease-out both" }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Graduation Units</h2>
              <Button variant="icon" size="icon" onClick={() => setEditing(false)} className="text-lg leading-none">×</Button>
            </div>
            <SetupScreen
              totalUnits={totalUnits}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
