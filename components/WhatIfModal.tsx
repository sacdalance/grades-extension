import { useState, useRef } from "react"
import { X, Trash2 } from "lucide-react"
import { Button } from "~components/ui/button"
import { Input } from "~components/ui/input"
import { ProjectionModal } from "~components/ProjectionModal"
import { getScholarStatus, displayScholar } from "~utils/honors"

interface Props {
  currentGWA: number
  currentUnits: number
  totalUnits: number
  onSaveTotalUnits: (units: number) => void
  onClose: () => void
}

const UP_GRADES = [1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00, 4.00, 5.00]

interface WSubject {
  id: number
  code: string
  units: number
  grade: number
  gradeLabel: string
  excludeFromGWA: boolean
}

interface WTerm {
  id: number
  name: string
  subjects: WSubject[]
}

function makeSubject(id: number): WSubject {
  return { id, code: "New Subject", units: 3, grade: 1.0, gradeLabel: "", excludeFromGWA: false }
}

function termGWA(subjects: WSubject[]): { gwa: number; units: number } {
  const active = subjects.filter(s => !s.excludeFromGWA && !s.gradeLabel && s.grade > 0)
  const units = active.reduce((s, x) => s + x.units, 0)
  const pts = active.reduce((s, x) => s + x.units * x.grade, 0)
  return { gwa: units > 0 ? pts / units : 0, units }
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-upb-green/5 border border-upb-green/10 px-3 py-2.5 text-center">
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-xl font-semibold text-upb-green tabular-nums leading-none">{value}</span>
      {sub && <span className="text-[10px] text-gray-400 mt-0.5">{sub}</span>}
    </div>
  )
}

function WhatIfTermGroup({ term, onUpdate, onDelete, nextSubjectId }: {
  term: WTerm
  onUpdate: (t: WTerm) => void
  onDelete: () => void
  nextSubjectId: () => number
}) {
  const { gwa, units } = termGWA(term.subjects)
  const scholar = getScholarStatus(gwa, units, term.subjects.map(s => ({
    code: s.code, units: s.units, grade: s.grade,
    gradeLabel: s.gradeLabel || undefined, excludeFromGWA: s.excludeFromGWA
  })))

  const updateSubject = (id: number, changes: Partial<WSubject>) => {
    onUpdate({ ...term, subjects: term.subjects.map(s => s.id === id ? { ...s, ...changes } : s) })
  }

  const addSubject = () => {
    if (term.subjects.length >= 20) return
    onUpdate({ ...term, subjects: [...term.subjects, makeSubject(nextSubjectId())] })
  }

  const deleteSubject = (id: number) => {
    onUpdate({ ...term, subjects: term.subjects.filter(s => s.id !== id) })
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      {/* Term header */}
      <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 border-b border-gray-200">
        <div className="flex-1 min-w-0">
          <Input
            value={term.name}
            maxLength={30}
            className="text-sm font-semibold text-gray-900 bg-transparent border-none shadow-none px-0 h-auto focus-visible:ring-0"
            onChange={(e) => onUpdate({ ...term, name: e.target.value })}
          />
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400 tabular-nums">{Math.round(units)} units</span>
            <span className="text-xs font-semibold text-upb-green tabular-nums">{gwa.toFixed(4)} GWA</span>
          </div>
          {scholar.status && (
            <div className={`mt-1.5 inline-flex border-l-2 pl-2 pr-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              scholar.status === "University Scholar"
                ? "border-green-600 bg-green-600/10 text-green-700"
                : "border-green-800 bg-green-800/10 text-green-800"
            }`}>
              {displayScholar(scholar.status)}
            </div>
          )}
          {!scholar.status && scholar.reason && (
            <span className="mt-0.5 block text-[10px] text-gray-400 italic">{scholar.reason}</span>
          )}
        </div>
        <button onClick={onDelete} className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Subject table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: "22rem" }}>
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-[10px] font-medium text-gray-400 uppercase tracking-wider px-4 py-2">Subject</th>
              <th className="text-center text-[10px] font-medium text-gray-400 uppercase tracking-wider py-2" style={{ width: "5rem" }}>Units</th>
              <th className="text-center text-[10px] font-medium text-gray-400 uppercase tracking-wider py-2" style={{ width: "5rem" }}>Grade</th>
              <th style={{ width: "4rem" }} />
            </tr>
          </thead>
          <tbody>
            {term.subjects.map((s) => (
              <tr key={s.id} className={`border-b border-gray-50 transition-colors ${s.excludeFromGWA ? "bg-gray-50/70" : "hover:bg-gray-50/50"}`}>
                <td className="px-3 py-1">
                  <Input
                    value={s.code}
                    maxLength={15}
                    className="text-xs"
                    onChange={(e) => updateSubject(s.id, { code: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1" style={{ width: "5rem" }}>
                  <Input
                    type="number" value={s.units} step="1" min="0" max="6"
                    className="text-xs text-center"
                    onChange={(e) => updateSubject(s.id, { units: Math.min(6, Math.max(0, Math.round(parseFloat(e.target.value) || 0))) })}
                  />
                </td>
                <td className="pl-1 pr-3 py-1" style={{ width: "6rem" }}>
                  <select
                    value={s.gradeLabel || (s.grade === 0 ? "DRP" : s.grade)}
                    className={`w-full h-8 rounded-md border px-2 pr-7 py-1 text-xs text-center appearance-none transition-colors focus:outline-none focus:ring-1 cursor-pointer ${
                      s.gradeLabel
                        ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 focus:ring-amber-300/40 focus:border-amber-400"
                        : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50 focus:ring-upb-green/20 focus:border-upb-green/40"
                    }`}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === "INC" || val === "DRP") {
                        updateSubject(s.id, { grade: 0, gradeLabel: val, excludeFromGWA: true })
                      } else {
                        updateSubject(s.id, { grade: parseFloat(val), gradeLabel: "" })
                      }
                    }}>
                    {UP_GRADES.map(g => <option key={g} value={g}>{g.toFixed(2)}</option>)}
                    <option value="INC">INC</option>
                    <option value="DRP">DRP</option>
                  </select>
                </td>
                <td className="pr-1 text-center" style={{ width: "4rem" }}>
                  <div className="flex items-center justify-center gap-0.5">
                    <button
                      disabled={!!s.gradeLabel}
                      onClick={() => updateSubject(s.id, { excludeFromGWA: !s.excludeFromGWA })}
                      className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-tight transition-all ${
                        s.excludeFromGWA
                          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                      } disabled:opacity-40 disabled:cursor-not-allowed`}>
                      {s.excludeFromGWA ? "Excluded" : "Exclude"}
                    </button>
                    <button onClick={() => deleteSubject(s.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                      <X size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          onClick={addSubject}
          disabled={term.subjects.length >= 20}
          className="flex w-full items-center gap-1.5 px-4 py-2 text-xs font-medium text-upb-green/60 hover:text-upb-green hover:bg-upb-green/5 border-t border-dashed border-upb-green/20 hover:border-upb-green/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-upb-green/60 disabled:hover:bg-transparent">
          {term.subjects.length >= 20 ? "Subject limit reached (20)" : "+ Add Subject"}
        </button>
      </div>
    </div>
  )
}

export function WhatIfModal({ currentGWA, currentUnits, totalUnits, onSaveTotalUnits, onClose }: Props) {
  const sid = useRef(0)
  const tid = useRef(0)
  const nextSid = () => ++sid.current
  const nextTid = () => ++tid.current

  const [terms, setTerms] = useState<WTerm[]>([
    { id: nextTid(), name: "Hypothetical Term 1", subjects: [makeSubject(nextSid())] }
  ])
  const [newTermName, setNewTermName] = useState("")
  const [projectOpen, setProjectOpen] = useState(false)

  const addedUnits = terms.reduce((sum, t) => sum + termGWA(t.subjects).units, 0)
  const addedPoints = terms.reduce((sum, t) => {
    const { gwa, units } = termGWA(t.subjects)
    return sum + gwa * units
  }, 0)
  const projectedUnits = currentUnits + addedUnits
  const projectedGWA = projectedUnits > 0
    ? (currentGWA * currentUnits + addedPoints) / projectedUnits
    : 0

  const createTerm = () => {
    if (terms.length >= 20) return
    const name = newTermName.trim() || `Hypothetical Term ${terms.length + 1}`
    setTerms(prev => [...prev, { id: nextTid(), name, subjects: [makeSubject(nextSid())] }])
    setNewTermName("")
  }

  const updateTerm = (id: number, updated: WTerm) => {
    setTerms(prev => prev.map(t => t.id === id ? updated : t))
  }

  const deleteTerm = (id: number) => {
    setTerms(prev => prev.filter(t => t.id !== id))
  }

  return (
    <>
      <div
        className="pointer-events-auto flex items-center justify-center"
        style={{ position: "fixed", inset: 0, zIndex: 2147483648, background: "rgba(0,0,0,0.4)", animation: "gwa-fade 0.15s ease-out both" }}>

        <div
          className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
          style={{ width: "min(36rem, 92vw)", maxHeight: "82vh", animation: "gwa-slide-up 0.2s ease-out both" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">What-If Calculator</h2>
            <Button variant="icon" size="icon" onClick={onClose} className="text-lg leading-none">×</Button>
          </div>

          {/* Projected stats */}
          <div className="px-5 py-4 border-b border-gray-100 shrink-0 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <StatBox
                label="Units"
                value={Math.round(projectedUnits).toString()}
                sub="total projected"
              />
              <StatBox
                label="GWA"
                value={currentGWA.toFixed(4)}
                sub="saved GWA"
              />
              <StatBox
                label="Added"
                value={addedUnits > 0 ? `+${Math.round(addedUnits)}` : "0"}
                sub="units added"
              />
              <StatBox
                label="What-If GWA"
                value={projectedGWA > 0 ? projectedGWA.toFixed(4) : currentGWA.toFixed(4)}
                sub={projectedGWA > 0 && projectedGWA !== currentGWA
                  ? projectedGWA < currentGWA ? "▲ improved" : "▼ lower"
                  : "no change"}
              />
            </div>
            <Button
              className="w-full bg-gray-900 hover:bg-gray-800 text-white h-9 shadow-sm font-semibold text-sm"
              onClick={() => setProjectOpen(true)}
              disabled={projectedGWA === 0 || totalUnits === 0}>
              Project Latin Honors
            </Button>
          </div>

          {/* Term list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="pl-3 border-l-2 border-upb-green/30">
              <p className="text-xs font-semibold text-gray-900">What-If Calculator</p>
              <p className="text-[10px] text-gray-400">Starting from your {Math.round(currentUnits)} saved units · <span className="font-bold text-gray-600">{currentGWA.toFixed(4)}</span> GWA</p>
              <p className="text-[10px] text-gray-500 leading-relaxed mt-1">
                Add hypothetical terms and subjects below to simulate how future grades would affect your cumulative GWA. Changes here are <span className="font-medium text-gray-700">not saved</span> and will be lost on page reload.
              </p>
            </div>
            {terms.map(t => (
              <WhatIfTermGroup
                key={t.id}
                term={t}
                onUpdate={(updated) => updateTerm(t.id, updated)}
                onDelete={() => deleteTerm(t.id)}
                nextSubjectId={nextSid}
              />
            ))}
          </div>

          {/* Add term */}
          <div className="px-5 py-3.5 border-t border-gray-100 shrink-0 space-y-2">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Add Term</p>
            <div className="flex gap-2">
              <Input
                className="flex-1 border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white"
                placeholder="e.g. First Semester 2025-2026"
                value={newTermName}
                maxLength={30}
                onChange={(e) => setNewTermName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createTerm()}
              />
              <Button size="sm" onClick={createTerm} disabled={terms.length >= 20}>Create</Button>
            </div>
          </div>
        </div>
      </div>

      {projectOpen && (
        <ProjectionModal
          currentGWA={projectedGWA > 0 ? projectedGWA : currentGWA}
          currentUnits={projectedUnits > 0 ? projectedUnits : currentUnits}
          totalUnits={totalUnits}
          onClose={() => setProjectOpen(false)}
          onSaveTotalUnits={onSaveTotalUnits}
        />
      )}
    </>
  )
}
