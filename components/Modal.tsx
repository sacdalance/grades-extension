import { useState, useEffect, useRef, useLayoutEffect } from "react"
import { Button } from "~components/ui/button"
import { Input } from "~components/ui/input"
import { TermGroup } from "~components/TermGroup"
import { ConfirmModal } from "~components/ConfirmModal"
import { ShareModal } from "~components/ShareModal"
import { PdfModal } from "~components/PdfModal"
import type { SavedTerms, Subject } from "~types"
import { parseImport } from "~utils/validation"
import { chronoOrder } from "~utils/calculator"

interface Props {
  savedTerms: SavedTerms
  termOrder: string[]
  onClose: () => void
  onUpdateSubject: (term: string, idx: number, changes: Partial<Subject>) => Promise<void>
  onAddSubject: (term: string) => Promise<void>
  onDeleteSubject: (term: string, idx: number) => Promise<void>
  onDeleteTerm: (term: string) => Promise<void>
  onRenameTerm: (oldKey: string, newKey: string) => Promise<void>
  onCreateTerm: (name: string, subjectCount?: number) => Promise<boolean>
  onSaveOrder: (keys: string[]) => Promise<void>
  onImport: (data: SavedTerms, termOrder?: string[]) => Promise<void>
  onReset: () => Promise<void>
  onAnalyze: () => void
}

function resolveOrder(termOrder: string[], savedTerms: SavedTerms): string[] {
  const allKeys = Object.keys(savedTerms)
  const stored = termOrder.filter(k => allKeys.includes(k))
  const added = allKeys.filter(k => !stored.includes(k)).sort((a, b) => chronoOrder(a) - chronoOrder(b))
  return [...stored, ...added]
}

export function Modal({ savedTerms, termOrder, onClose, onUpdateSubject, onAddSubject, onDeleteSubject, onDeleteTerm, onRenameTerm, onCreateTerm, onSaveOrder, onImport, onReset, onAnalyze }: Props) {
  const [newTerm, setNewTerm] = useState("")
  const [success, setSuccess] = useState("")
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmCreate, setConfirmCreate] = useState(false)
  const [confirmExport, setConfirmExport] = useState(false)
  const [pendingImport, setPendingImport] = useState<{
    data: SavedTerms
    termOrder?: string[]
    conflicts: { key: string; oldGwa: number; newGwa: number }[]
    newCount: number
  } | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [subjectCount, setSubjectCount] = useState(1)
  const [noDataMsg, setNoDataMsg] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [orderedKeys, setOrderedKeys] = useState<string[]>(() => resolveOrder(termOrder, savedTerms))

  const listRef = useRef<HTMLDivElement>(null)
  const snapshots = useRef<Map<string, number>>(new Map())
  const importRef = useRef<HTMLInputElement>(null)

  // Sync adds/deletes while preserving manual order
  useEffect(() => {
    setOrderedKeys(resolveOrder(termOrder, savedTerms))
  }, [termOrder, savedTerms])

  // FLIP animation
  useLayoutEffect(() => {
    if (!listRef.current || snapshots.current.size === 0) return
    listRef.current.querySelectorAll<HTMLElement>("[data-term-key]").forEach(el => {
      const key = el.dataset.termKey!
      const prev = snapshots.current.get(key)
      if (prev === undefined) return
      const dy = prev - el.getBoundingClientRect().top
      if (dy === 0) return
      el.style.transform = `translateY(${dy}px)`
      el.style.transition = "none"
      requestAnimationFrame(() => {
        el.style.transition = "transform 0.25s ease"
        el.style.transform = ""
      })
    })
    snapshots.current.clear()
  })

  const handleCreate = () => {
    const name = newTerm.trim()
    if (!name) { setCreateError("Please enter a term name."); return }
    if (name.length < 5) { setCreateError("Term name must be at least 5 characters."); return }
    if (Object.keys(savedTerms).length >= 20) { setCreateError("Maximum of 20 terms reached."); return }
    if (savedTerms[name]) { setCreateError(`"${name}" already exists.`); return }
    setConfirmCreate(true)
  }

  const doCreate = async () => {
    const name = newTerm.trim()
    const ok = await onCreateTerm(name, subjectCount)
    if (ok) {
      setSuccess(`"${name}" added.`)
      setNewTerm("")
      setSubjectCount(1)
      setTimeout(() => setSuccess(""), 3000)
    } else {
      setCreateError(Object.keys(savedTerms).length >= 20 ? "Maximum of 20 terms reached." : `"${name}" already exists.`)
    }
  }

  const handleReset = () => {
    setConfirmReset(true)
  }

  const move = async (idx: number, dir: -1 | 1) => {
    const next = [...orderedKeys]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    listRef.current?.querySelectorAll<HTMLElement>("[data-term-key]").forEach(el => {
      snapshots.current.set(el.dataset.termKey!, el.getBoundingClientRect().top)
    })
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setOrderedKeys(next)
    await onSaveOrder(next)
  }

  const handleExport = () => {
    const json = JSON.stringify({ terms: savedTerms, termOrder: orderedKeys }, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "gwa-grades.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      setCreateError("Only .json files are accepted.")
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = parseImport(JSON.parse(ev.target?.result as string))
        if (!parsed) throw new Error()
        const { terms: data, termOrder: importedOrder } = parsed
        const conflicts = Object.keys(data)
          .filter(k => !!savedTerms[k])
          .map(k => ({ key: k, oldGwa: savedTerms[k].gwa, newGwa: data[k].gwa }))
        const newCount = Object.keys(data).filter(k => !savedTerms[k]).length
        setPendingImport({ data, termOrder: importedOrder, conflicts, newCount })
      } catch {
        setCreateError("Invalid file. Must be a valid GWA grades JSON export.")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const doImport = async () => {
    if (!pendingImport) return
    await onImport(pendingImport.data, pendingImport.termOrder)
    setPendingImport(null)
    setSuccess("Imported successfully.")
    setTimeout(() => setSuccess(""), 3000)
  }

  return (
    <>
    <div
      className="pointer-events-auto flex items-center justify-center"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.4)",
        animation: "gwa-fade 0.15s ease-out both"
      }}>

      <div
        className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
        style={{
          width: "min(36rem, 92vw)",
          maxHeight: "82vh",
          animation: "gwa-slide-up 0.2s ease-out both"
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Saved Grades</h2>
          <Button variant="icon" size="icon" onClick={onClose} className="text-lg leading-none">×</Button>
        </div>

        {/* Term list */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {orderedKeys.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              No saved terms yet. Use Save Term or Scan AMIS to get started.
            </p>
          ) : (
            orderedKeys.filter(key => !!savedTerms[key]).map((key, idx, visible) => (
              <div key={key} data-term-key={key} className="flex gap-2 items-start">
                <div className="flex flex-col items-center gap-0.5 pt-2.5 shrink-0">
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="text-gray-300 hover:text-gray-500 disabled:opacity-20 disabled:cursor-default text-xs leading-none px-0.5">
                    ▲
                  </button>
                  <span className="text-[10px] font-medium text-gray-400 tabular-nums leading-none">{idx + 1}</span>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === visible.length - 1}
                    className="text-gray-300 hover:text-gray-500 disabled:opacity-20 disabled:cursor-default text-xs leading-none px-0.5">
                    ▼
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <TermGroup
                    termKey={key}
                    term={savedTerms[key]}
                    onUpdateSubject={onUpdateSubject}
                    onAddSubject={onAddSubject}
                    onDeleteSubject={onDeleteSubject}
                    onDeleteTerm={onDeleteTerm}
                    onRenameTerm={onRenameTerm}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions row */}
        <div className="border-t border-gray-200 px-5 pt-3 pb-0 flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button size="sm" onClick={() => Object.keys(savedTerms).length < 2 ? setNoDataMsg("You need at least 2 saved terms to use Analyze.") : onAnalyze()}>Analyze</Button>
            <Button size="sm" onClick={() => orderedKeys.length === 0 ? setNoDataMsg("No saved terms to share. Save a term first.") : setShareOpen(true)}>Share</Button>
            <Button size="sm" onClick={() => orderedKeys.length === 0 ? setNoDataMsg("No saved terms to export as PDF. Save a term first.") : setPdfOpen(true)}>PDF</Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => importRef.current?.click()}>Import</Button>
            <Button size="sm" variant="secondary" onClick={() => orderedKeys.length === 0 ? setNoDataMsg("No saved terms to export. Save a term first.") : setConfirmExport(true)}>Export</Button>
            <Button variant="danger" size="sm" onClick={() => orderedKeys.length === 0 ? setNoDataMsg("No saved terms to reset.") : handleReset()}>Reset All</Button>
          </div>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
        </div>

        {/* Add term */}
        <div className="px-5 py-3.5 space-y-2">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Add Term</p>
          <div className="flex gap-2">
            <Input
              className="flex-1 border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white"
              placeholder="e.g. First Semester 2024-2025"
              value={newTerm}
              maxLength={30}
              onChange={(e) => setNewTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button size="sm" onClick={handleCreate}>Create</Button>
          </div>
          {success && (
            <div className="rounded-md border border-upb-green/20 bg-upb-green/5 px-3 py-2">
              <p className="text-xs text-upb-green">{success}</p>
            </div>
          )}
        </div>
      </div>
    </div>

    {createError && (
      <div
        className="pointer-events-auto flex items-center justify-center"
        style={{ position: "fixed", inset: 0, zIndex: 2147483648, background: "rgba(0,0,0,0.45)", animation: "gwa-fade 0.15s ease-out both" }}>
        <div
          className="bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
          style={{ width: "min(20rem, 92vw)", animation: "gwa-slide-up 0.2s ease-out both" }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Cannot create term</p>
            <button onClick={() => setCreateError(null)} className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none">×</button>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-[11px] text-gray-500 leading-relaxed">{createError}</p>
            <Button size="sm" className="w-full" onClick={() => setCreateError(null)}>Got it</Button>
          </div>
        </div>
      </div>
    )}

    {noDataMsg && (
      <div
        className="pointer-events-auto flex items-center justify-center"
        style={{ position: "fixed", inset: 0, zIndex: 2147483648, background: "rgba(0,0,0,0.45)", animation: "gwa-fade 0.15s ease-out both" }}>
        <div
          className="bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
          style={{ width: "min(20rem, 92vw)", animation: "gwa-slide-up 0.2s ease-out both" }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">No data yet</p>
            <button onClick={() => setNoDataMsg(null)} className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none">×</button>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="rounded-md bg-gray-50 border border-gray-100 px-3 py-2.5 space-y-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">What you need</p>
              <p className="text-[11px] text-gray-600 leading-relaxed">{noDataMsg}</p>
            </div>
            <Button size="sm" className="w-full" onClick={() => setNoDataMsg(null)}>Got it</Button>
          </div>
        </div>
      </div>
    )}

    {pendingImport && (
      <div
        className="pointer-events-auto flex items-center justify-center"
        style={{ position: "fixed", inset: 0, zIndex: 2147483648, background: "rgba(0,0,0,0.45)", animation: "gwa-fade 0.15s ease-out both" }}>
        <div
          className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
          style={{ width: "min(22rem, 92vw)", maxHeight: "72vh", animation: "gwa-slide-up 0.2s ease-out both" }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">Review Import</h2>
            <button onClick={() => setPendingImport(null)} className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none">×</button>
          </div>
          <div className="px-5 py-4 space-y-3 flex flex-col flex-1 overflow-hidden">
            <p className="text-[11px] text-gray-500 shrink-0">
              {pendingImport.newCount > 0 && (
                <span className="text-upb-green font-medium">{pendingImport.newCount} new term{pendingImport.newCount !== 1 ? "s" : ""} will be added. </span>
              )}
              {pendingImport.conflicts.length > 0
                ? <><span className="font-medium text-gray-700">{pendingImport.conflicts.length} term{pendingImport.conflicts.length !== 1 ? "s" : ""}</span> already saved will be overwritten:</>
                : pendingImport.newCount === 0 ? <span className="text-gray-400">No changes.</span> : null
              }
            </p>
            {pendingImport.conflicts.length > 0 && (
              <div className="space-y-1.5 overflow-y-auto flex-1">
                {pendingImport.conflicts.map(c => (
                  <div key={c.key} className="rounded-md bg-gray-50 border border-gray-100 px-3 py-2">
                    <p className="text-[11px] font-medium text-gray-700 truncate">{c.key}</p>
                    <p className="text-[10px] text-gray-400">
                      Saved: <span className="font-medium text-gray-600">{c.oldGwa.toFixed(4)}</span>
                      {" → "}
                      New: <span className="font-medium text-upb-green">{c.newGwa.toFixed(4)}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => setPendingImport(null)}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={doImport}>Confirm Import</Button>
            </div>
          </div>
        </div>
      </div>
    )}

    {shareOpen && (
      <ShareModal
        savedTerms={savedTerms}
        termOrder={orderedKeys}
        onClose={() => setShareOpen(false)}
      />
    )}

    {pdfOpen && (
      <PdfModal
        savedTerms={savedTerms}
        termOrder={orderedKeys}
        onClose={() => setPdfOpen(false)}
      />
    )}

    {confirmExport && (
      <ConfirmModal
        title="Export grades"
        message="This will download all your saved grades as a JSON file."
        confirmLabel="Export"
        onConfirm={() => { setConfirmExport(false); handleExport() }}
        onCancel={() => setConfirmExport(false)}
      />
    )}

    {confirmCreate && (
      <div
        className="pointer-events-auto flex items-center justify-center"
        style={{ position: "fixed", inset: 0, zIndex: 2147483648, background: "rgba(0,0,0,0.4)", animation: "gwa-fade 0.15s ease-out both" }}>
        <div
          className="bg-white rounded-lg border border-gray-200 shadow-lg px-5 py-4 space-y-4"
          style={{ width: "min(20rem, 92vw)", animation: "gwa-slide-up 0.2s ease-out both" }}>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-800 break-words">Create term "{newTerm.trim()}"?</p>
            <p className="text-[11px] text-gray-400">How many subjects to start with?</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={20}
              value={subjectCount}
              onChange={(e) => setSubjectCount(Math.min(20, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-20 h-8 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 text-center focus:outline-none focus:border-upb-green/40 focus:ring-1 focus:ring-upb-green/20"
            />
            <span className="text-xs text-gray-400">subjects (0–20)</span>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setConfirmCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { setConfirmCreate(false); doCreate() }}>Create</Button>
          </div>
        </div>
      </div>
    )}

    {confirmReset && (
      <ConfirmModal
        title="Reset all data"
        message="This will permanently delete all saved terms. This cannot be undone."
        confirmLabel="Reset"
        confirmVariant="danger"
        onConfirm={() => { setConfirmReset(false); onReset() }}
        onCancel={() => setConfirmReset(false)}
      />
    )}
    </>
  )
}
