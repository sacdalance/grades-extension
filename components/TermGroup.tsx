import { useState } from "react"
import { getScholarStatus } from "~utils/honors"
import { Input } from "~components/ui/input"
import { X, Trash2 } from "lucide-react"
import { ConfirmModal } from "~components/ConfirmModal"
import type { Subject, Term } from "~types"

interface Props {
  termKey: string
  term: Term
  onUpdateSubject: (term: string, idx: number, field: keyof Subject, value: string | number) => Promise<void>
  onAddSubject: (term: string) => Promise<void>
  onDeleteSubject: (term: string, idx: number) => Promise<void>
  onDeleteTerm: (term: string) => void
}

export function TermGroup({ termKey, term, onUpdateSubject, onAddSubject, onDeleteSubject, onDeleteTerm }: Props) {
  const scholar = getScholarStatus(term.gwa, term.units, term.subjects)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <>
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      {/* Term header */}
      <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 border-b border-gray-200">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-900 block truncate">{termKey}</span>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-400 tabular-nums">{Math.round(term.units)} units</span>
            <span className="text-xs font-semibold text-upb-green tabular-nums">{term.gwa.toFixed(4)} GWA</span>
            {scholar.status && (
              <span className={`inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium ${
                scholar.status === "University Scholar" ? "bg-upb-green text-white"
                : scholar.status === "Academic Achiever" ? "bg-upb-gold text-white"
                : "bg-upb-maroon text-white"
              }`}>
                {scholar.status}
              </span>
            )}
            {scholar.disqualified && (
              <span className="text-[10px] text-gray-400 italic">{scholar.reason}</span>
            )}
          </div>
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
                      className="text-xs"
                      onChange={(e) => onUpdateSubject(termKey, idx, "code", e.target.value)}
                    />
                    {s.excludeFromGWA && (
                      <span className="shrink-0 text-[9px] text-gray-400 border border-gray-300 rounded px-1 py-px whitespace-nowrap">
                        not in GWA
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-1 py-1" style={{ width: "5rem" }}>
                  <Input
                    type="number" value={s.units} step="0.5" min="0" max="6"
                    className="text-xs text-center"
                    onChange={(e) => {
                      const v = Math.min(6, Math.max(0, parseFloat(e.target.value) || 0))
                      onUpdateSubject(termKey, idx, "units", v)
                    }}
                  />
                </td>
                <td className="px-1 py-1" style={{ width: "5rem" }}>
                  <Input
                    type="number" value={s.grade} step="0.25" min="1.0" max="5.0"
                    className="text-xs text-center"
                    onChange={(e) => {
                      const v = Math.min(5, Math.max(1, parseFloat(e.target.value) || 1))
                      onUpdateSubject(termKey, idx, "grade", v)
                    }}
                  />
                </td>
                <td className="pr-2 text-center" style={{ width: "2.5rem" }}>
                  <button
                    onClick={() => onDeleteSubject(termKey, idx)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1">
                    <X size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          onClick={() => onAddSubject(termKey)}
          className="flex w-full items-center gap-1.5 px-4 py-2 text-xs font-medium text-upb-green/60 hover:text-upb-green hover:bg-upb-green/5 border-t border-dashed border-upb-green/20 hover:border-upb-green/40 transition-colors">
          + Add Subject
        </button>
      </div>
    </div>

    {confirmDelete && (
      <ConfirmModal
        message={`Delete all saved data for "${termKey}"?`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => { setConfirmDelete(false); onDeleteTerm(termKey) }}
        onCancel={() => setConfirmDelete(false)}
      />
    )}
  </>
  )
}
