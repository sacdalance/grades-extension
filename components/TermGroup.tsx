import { useState, useRef } from "react"
import { getScholarStatus, displayScholar } from "~utils/honors"
import { Input } from "~components/ui/input"
import { X, Trash2 } from "lucide-react"
import { ConfirmModal } from "~components/ConfirmModal"
import type { Subject, Term } from "~types"

const UP_GRADES = [1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00, 4.00, 5.00]

interface Props {
  termKey: string
  term: Term
  onUpdateSubject: (term: string, idx: number, changes: Partial<Subject>) => Promise<void>
  onAddSubject: (term: string) => Promise<void>
  onDeleteSubject: (term: string, idx: number) => Promise<void>
  onDeleteTerm: (term: string) => void
  onRenameTerm: (oldKey: string, newKey: string) => Promise<void>
}

export function TermGroup({ termKey, term, onUpdateSubject, onAddSubject, onDeleteSubject, onDeleteTerm, onRenameTerm }: Props) {
  const scholar = getScholarStatus(term.gwa, term.units, term.subjects)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [nameInput, setNameInput] = useState(termKey)
  const pending = useRef(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedUpdate = (termKey: string, idx: number, changes: Partial<Subject>) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => { onUpdateSubject(termKey, idx, changes) }, 500)
  }

  const commitRename = () => {
    const trimmed = nameInput.trim()
    if (trimmed && trimmed !== termKey) onRenameTerm(termKey, trimmed)
    else setNameInput(termKey)
  }

  const guard = async (fn: () => Promise<void>) => {
    if (pending.current) return
    pending.current = true
    try { await fn() } finally { pending.current = false }
  }

  return (
    <>
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      {/* Term header */}
      <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 border-b border-gray-200">
        <div className="flex-1 min-w-0">
          <Input
            value={nameInput}
            maxLength={30}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur() } else if (e.key === "Escape") { setNameInput(termKey); e.currentTarget.blur() } }}
            className="text-sm font-semibold text-gray-900 bg-transparent border-none shadow-none px-0 h-auto focus-visible:ring-0 hover:bg-gray-100 focus:bg-white rounded transition-colors"
          />
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400 tabular-nums">{Math.round(term.units)} units</span>
            <span className="text-xs font-semibold text-upb-green tabular-nums">{term.gwa.toFixed(4)} GWA</span>
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
        <button
          onClick={() => setConfirmDelete(true)}
          className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Subject table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: "22rem" }}>
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-[10px] font-medium text-gray-400 uppercase tracking-wider px-4 py-2">
                Subject
              </th>
              <th className="text-center text-[10px] font-medium text-gray-400 uppercase tracking-wider py-2" style={{ width: "5rem" }}>
                Units
              </th>
              <th className="text-center text-[10px] font-medium text-gray-400 uppercase tracking-wider py-2" style={{ width: "5rem" }}>
                Grade
              </th>
              <th style={{ width: "2.5rem" }} />
            </tr>
          </thead>
          <tbody>
            {term.subjects.map((s, idx) => (
              <tr key={idx} className={`border-b border-gray-50 transition-colors ${s.excludeFromGWA ? "bg-gray-50/70" : "hover:bg-gray-50/50"}`}>
                <td className="px-3 py-1">
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={s.code}
                      maxLength={15}
                      className="text-xs"
                      onChange={(e) => debouncedUpdate(termKey, idx, { code: e.target.value })}
                    />
                  </div>
                </td>
                <td className="px-1 py-1" style={{ width: "5rem" }}>
                  <Input
                    type="number" value={s.units} step="1" min="0" max="6"
                    className="text-xs text-center"
                    onChange={(e) => {
                      const v = Math.min(6, Math.max(0, Math.round(parseFloat(e.target.value) || 0)))
                      debouncedUpdate(termKey, idx, { units: v })
                    }}
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
                        guard(() => onUpdateSubject(termKey, idx, { grade: 0, gradeLabel: val, excludeFromGWA: true }))
                      } else {
                        guard(() => onUpdateSubject(termKey, idx, { grade: parseFloat(val), gradeLabel: "" }))
                      }
                    }}>
                    {UP_GRADES.map(g => (
                      <option key={g} value={g}>{g.toFixed(2)}</option>
                    ))}
                    <option value="INC">INC</option>
                    <option value="DRP">DRP</option>
                  </select>
                </td>
                <td className="pr-1 text-center" style={{ width: "4rem" }}>
                  <div className="flex items-center justify-center gap-0.5">
                    <button
                      title={s.excludeFromGWA ? "Click to include in GWA" : "Click to exclude from GWA"}
                      disabled={!!s.gradeLabel}
                      onClick={() => onUpdateSubject(termKey, idx, { excludeFromGWA: !s.excludeFromGWA })}
                      className={`w-16 py-1 rounded text-[9px] font-bold uppercase tracking-tight transition-all ${
                        s.excludeFromGWA
                          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                      } disabled:opacity-40 disabled:cursor-not-allowed`}>
                      {s.excludeFromGWA ? "Excluded" : "Exclude"}
                    </button>
                    <button
                      onClick={() => guard(() => onDeleteSubject(termKey, idx))}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1">
                      <X size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          onClick={() => guard(() => onAddSubject(termKey))}
          disabled={term.subjects.length >= 20}
          className="flex w-full items-center gap-1.5 px-4 py-2 text-xs font-medium text-upb-green/60 hover:text-upb-green hover:bg-upb-green/5 border-t border-dashed border-upb-green/20 hover:border-upb-green/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-upb-green/60 disabled:hover:bg-transparent">
          {term.subjects.length >= 20 ? "Subject limit reached (20)" : "+ Add Subject"}
        </button>
      </div>
    </div>

    {confirmDelete && (
      <ConfirmModal
        title="Delete term"
        message={`This will permanently delete all saved data for "${termKey}".`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => { setConfirmDelete(false); onDeleteTerm(termKey) }}
        onCancel={() => setConfirmDelete(false)}
      />
    )}
  </>
  )
}
