import { useState, useEffect, useRef, useLayoutEffect } from "react"
import { Button } from "~components/ui/button"
import { Input } from "~components/ui/input"
import { TermGroup } from "~components/TermGroup"
import { ConfirmModal } from "~components/ConfirmModal"
import { ShareModal } from "~components/ShareModal"
import type { SavedTerms, Subject } from "~types"

interface Props {
  savedTerms: SavedTerms
  termOrder: string[]
  onClose: () => void
  onUpdateSubject: (term: string, idx: number, changes: Partial<Subject>) => Promise<void>
  onAddSubject: (term: string) => Promise<void>
  onDeleteSubject: (term: string, idx: number) => Promise<void>
  onDeleteTerm: (term: string) => Promise<void>
  onCreateTerm: (name: string) => Promise<boolean>
  onSaveOrder: (keys: string[]) => Promise<void>
  onImport: (data: SavedTerms) => Promise<void>
  onReset: () => Promise<void>
}

function chronoOrder(key: string) {
  const yearMatch = key.match(/(\d{4})\s*[-–]\s*\d{4}/)
  const startYear = yearMatch ? parseInt(yearMatch[1]) : 9999
  const lower = key.toLowerCase()
  const semOrder = lower.includes("first") || lower.includes("1st") ? 0
    : lower.includes("mid") || lower.includes("summer") ? 1
    : lower.includes("second") || lower.includes("2nd") ? 2
    : 3
  return startYear * 10 + semOrder
}

function resolveOrder(termOrder: string[], savedTerms: SavedTerms): string[] {
  const allKeys = Object.keys(savedTerms)
  const stored = termOrder.filter(k => allKeys.includes(k))
  const added = allKeys.filter(k => !stored.includes(k)).sort((a, b) => chronoOrder(a) - chronoOrder(b))
  return [...stored, ...added]
}

export function Modal({ savedTerms, termOrder, onClose, onUpdateSubject, onAddSubject, onDeleteSubject, onDeleteTerm, onCreateTerm, onSaveOrder, onImport, onReset }: Props) {
  const [newTerm, setNewTerm] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmCreate, setConfirmCreate] = useState(false)
  const [confirmExport, setConfirmExport] = useState(false)
  const [confirmImport, setConfirmImport] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
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
    if (!newTerm.trim()) {
      setError("Please enter a term name.")
      setSuccess("")
      return
    }
    setError("")
    setConfirmCreate(true)
  }

  const doCreate = async () => {
    const name = newTerm.trim()
    const ok = await onCreateTerm(name)
    if (ok) {
      setSuccess(`"${name}" added.`)
      setError("")
      setNewTerm("")
      setTimeout(() => setSuccess(""), 3000)
    } else {
      setError(`"${name}" already exists.`)
      setSuccess("")
    }
  }

  const handleReset = () => {
    setConfirmReset(true)
  }

  const handleDeleteTerm = async (term: string) => {
    await onDeleteTerm(term)
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
    const json = JSON.stringify(savedTerms, null, 2)
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
      setError("Only .json files are accepted.")
      return
    }
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as SavedTerms
        if (typeof data !== "object" || Array.isArray(data)) throw new Error()
        await onImport(data)
        setSuccess("Imported successfully.")
        setError("")
        setTimeout(() => setSuccess(""), 3000)
      } catch {
        setError("Invalid file. Must be a GWA grades JSON export.")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
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
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>

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
              No saved terms yet. Save a term from the calculator widget.
            </p>
          ) : (
            orderedKeys.filter(key => !!savedTerms[key]).map((key, idx, visible) => (
              <div key={key} data-term-key={key} className="flex gap-2 items-start">
                <div className="flex flex-col gap-1 pt-2.5 shrink-0">
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="text-gray-300 hover:text-gray-500 disabled:opacity-20 disabled:cursor-default text-xs leading-none px-0.5">
                    ▲
                  </button>
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
                    onDeleteTerm={handleDeleteTerm}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions row */}
        <div className="border-t border-gray-200 px-5 pt-3 pb-0 flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => setConfirmExport(true)} disabled={orderedKeys.length === 0}>Export JSON</Button>
          <Button variant="secondary" size="sm" onClick={() => setConfirmImport(true)}>Import JSON</Button>
          <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)} disabled={orderedKeys.length === 0}>Share</Button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
          <Button size="sm" className="ml-auto bg-upb-maroon hover:bg-upb-maroon/90 text-white disabled:opacity-40 disabled:cursor-not-allowed" onClick={handleReset} disabled={orderedKeys.length === 0}>Reset All</Button>
        </div>

        {/* Add term */}
        <div className="px-5 py-3.5 space-y-2">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Add Term</p>
          <div className="flex gap-2">
            <Input
              className="flex-1 border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white"
              placeholder="e.g. First Semester 2024-2025"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button size="sm" onClick={handleCreate}>Create</Button>
          </div>
          {error && (
            <div className="rounded-md border border-upb-maroon/20 bg-upb-maroon/5 px-3 py-2">
              <p className="text-xs text-upb-maroon">{error}</p>
            </div>
          )}
          {success && (
            <div className="rounded-md border border-upb-green/20 bg-upb-green/5 px-3 py-2">
              <p className="text-xs text-upb-green">{success}</p>
            </div>
          )}
        </div>
      </div>
    </div>

    {shareOpen && (
      <ShareModal
        savedTerms={savedTerms}
        termOrder={orderedKeys}
        onClose={() => setShareOpen(false)}
      />
    )}

    {confirmExport && (
      <ConfirmModal
        message="Export all saved grades as a JSON file?"
        confirmLabel="Export"
        onConfirm={() => { setConfirmExport(false); handleExport() }}
        onCancel={() => setConfirmExport(false)}
      />
    )}

    {confirmImport && (
      <ConfirmModal
        message="Import a JSON file? This will replace all current saved data."
        confirmLabel="Import"
        confirmVariant="danger"
        onConfirm={() => { setConfirmImport(false); importRef.current?.click() }}
        onCancel={() => setConfirmImport(false)}
      />
    )}

    {confirmCreate && (
      <ConfirmModal
        message={`Create term "${newTerm.trim()}"?`}
        confirmLabel="Create"
        onConfirm={() => { setConfirmCreate(false); doCreate() }}
        onCancel={() => setConfirmCreate(false)}
      />
    )}

    {confirmReset && (
      <ConfirmModal
        message="Reset all saved terms? This cannot be undone."
        confirmLabel="Reset"
        confirmVariant="danger"
        onConfirm={() => { setConfirmReset(false); onReset() }}
        onCancel={() => setConfirmReset(false)}
      />
    )}
    </>
  )
}
