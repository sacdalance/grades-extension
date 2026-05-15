import { useState, useRef } from "react"
import { useStorage } from "@plasmohq/storage/hook"
import { Storage } from "@plasmohq/storage" // used by handleReset
import { Dashboard } from "~components/Dashboard"
import { Modal } from "~components/Modal"
import { useGradeScanner } from "~hooks/useGradeScanner"
import type { SavedTerms, Subject } from "~types"
import { calcCumulativeGWA, recalcTerms } from "~utils/calculator"

export function App() {
  const [modalOpen, setModalOpen] = useState(false)

  const [savedTerms, setSavedTerms] = useStorage<SavedTerms>("savedTerms", (v) =>
    v === undefined ? {} : v
  )
  const terms = savedTerms ?? {}
  const savedTermsRef = useRef<SavedTerms>(terms)
  savedTermsRef.current = terms
  const [termOrder, setTermOrder] = useStorage<string[]>("termOrder", (v) =>
    v === undefined ? [] : v
  )

  const { data: current, status, setStatus } = useGradeScanner()
  const cumulative = calcCumulativeGWA(Object.values(terms))

  const persist = async (next: SavedTerms) => {
    await setSavedTerms(recalcTerms(next))
  }
  const savedVersion = terms[current.term]
  const saveState: "new" | "saved" | "update" = (() => {
    if (!savedVersion || current.units === 0) return "new"
    if (Math.round(savedVersion.gwa * 10000) !== Math.round(current.gwa * 10000)) return "update"
    if (savedVersion.subjects.length !== current.subjects.length) return "update"
    if (savedVersion.subjects.some((s, i) => {
      const c = current.subjects[i]
      return s.code !== c.code || s.grade !== c.grade || s.units !== c.units
    })) return "update"
    return "saved"
  })()

  const saving = useRef(false)
  const handleSave = async () => {
    if (saveState === "saved" || saving.current) return
    saving.current = true
    try {
      await persist({ ...terms, [current.term]: current })
      setStatus(saveState === "update" ? `Updated "${current.term}"!` : `Saved "${current.term}"!`)
    } finally {
      saving.current = false
    }
  }

  const handleCreateTerm = async (name: string): Promise<boolean> => {
    if (savedTermsRef.current[name]) return false
    await persist({ ...savedTermsRef.current, [name]: { term: name, units: 0, gwa: 0, subjects: [] } })
    return true
  }

  const handleDeleteTerm = async (termKey: string) => {
    const updated = { ...savedTermsRef.current }
    delete updated[termKey]
    await persist(updated)
    await setTermOrder((termOrder ?? []).filter(k => k !== termKey))
  }

  const handleSaveOrder = async (orderedKeys: string[]) => {
    await setTermOrder(orderedKeys)
  }

  const handleImport = async (data: SavedTerms, importedOrder?: string[]) => {
    const merged = { ...savedTermsRef.current, ...data }
    await persist(merged)
    const existingOrder = termOrder ?? []
    const mergedKeys = Object.keys(merged)
    const kept = existingOrder.filter(k => mergedKeys.includes(k))
    const newKeys = (importedOrder ?? Object.keys(data)).filter(k => !kept.includes(k) && mergedKeys.includes(k))
    if (newKeys.length > 0) await setTermOrder([...kept, ...newKeys])
  }

  const handleReset = async () => {
    const storage = new Storage()
    await storage.remove("savedTerms")
    await storage.remove("termOrder")
  }

  const handleUpdateSubject = async (
    termKey: string,
    idx: number,
    changes: Partial<Subject>
  ) => {
    const terms = { ...savedTermsRef.current }
    const subjects = [...terms[termKey].subjects]
    subjects[idx] = { ...subjects[idx], ...changes }
    terms[termKey] = { ...terms[termKey], subjects }
    await persist(terms)
  }

  const handleAddSubject = async (termKey: string) => {
    const terms = { ...savedTermsRef.current }
    terms[termKey] = {
      ...terms[termKey],
      subjects: [...terms[termKey].subjects, { code: "New Subject", units: 3, grade: 1.0 }]
    }
    await persist(terms)
  }

  const handleDeleteSubject = async (termKey: string, idx: number) => {
    const terms = { ...savedTermsRef.current }
    terms[termKey] = {
      ...terms[termKey],
      subjects: terms[termKey].subjects.filter((_, i) => i !== idx)
    }
    await persist(terms)
  }

  return (
    <>
      <Dashboard
        current={current}
        cumulative={cumulative}
        status={status}
        saveState={saveState}
        onSave={handleSave}
        onManage={() => setModalOpen(true)}
      />
      {modalOpen && (
        <Modal
          savedTerms={terms}
          termOrder={termOrder ?? []}
          onClose={() => setModalOpen(false)}
          onUpdateSubject={handleUpdateSubject}
          onAddSubject={handleAddSubject}
          onDeleteSubject={handleDeleteSubject}
          onDeleteTerm={handleDeleteTerm}
          onCreateTerm={handleCreateTerm}
          onSaveOrder={handleSaveOrder}
          onImport={handleImport}
          onReset={handleReset}
        />
      )}
    </>
  )
}
