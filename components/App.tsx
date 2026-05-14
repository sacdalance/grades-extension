import { useState } from "react"
import { useStorage } from "@plasmohq/storage/hook"
import { Storage } from "@plasmohq/storage"
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
  const [termOrder, setTermOrder] = useStorage<string[]>("termOrder", (v) =>
    v === undefined ? [] : v
  )

  const { data: current, status, setStatus } = useGradeScanner()
  const cumulative = calcCumulativeGWA(Object.values(savedTerms ?? {}))

  const persist = async (terms: SavedTerms) => {
    await setSavedTerms(recalcTerms(terms))
  }

  const termAlreadySaved = current.units > 0 && !!(savedTerms ?? {})[current.term]

  const handleSave = async () => {
    if (current.units === 0 || termAlreadySaved) return
    await persist({ ...(savedTerms ?? {}), [current.term]: current })
    setStatus(`Saved "${current.term}"!`)
  }

  const handleCreateTerm = async (name: string): Promise<boolean> => {
    if ((savedTerms ?? {})[name]) return false
    await persist({ ...(savedTerms ?? {}), [name]: { term: name, units: 0, gwa: 0, subjects: [] } })
    return true
  }

  const handleDeleteTerm = async (termKey: string) => {
    const updated = { ...(savedTerms ?? {}) }
    delete updated[termKey]
    await persist(updated)
    await setTermOrder((termOrder ?? []).filter(k => k !== termKey))
  }

  const handleSaveOrder = async (orderedKeys: string[]) => {
    await setTermOrder(orderedKeys)
  }

  const handleImport = async (data: SavedTerms) => {
    await persist(data)
    await setTermOrder(Object.keys(data))
  }

  const handleReset = async () => {
    const storage = new Storage()
    await storage.remove("savedTerms")
    await storage.remove("termOrder")
  }

  const handleUpdateSubject = async (
    termKey: string,
    idx: number,
    field: keyof Subject,
    value: string | number
  ) => {
    const terms = { ...(savedTerms ?? {}) }
    const subjects = [...terms[termKey].subjects]
    subjects[idx] = { ...subjects[idx], [field]: value }
    terms[termKey] = { ...terms[termKey], subjects }
    await persist(terms)
  }

  const handleAddSubject = async (termKey: string) => {
    const terms = { ...(savedTerms ?? {}) }
    terms[termKey] = {
      ...terms[termKey],
      subjects: [...terms[termKey].subjects, { code: "New Subject", units: 3, grade: 1.0 }]
    }
    await persist(terms)
  }

  const handleDeleteSubject = async (termKey: string, idx: number) => {
    const terms = { ...(savedTerms ?? {}) }
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
        termAlreadySaved={termAlreadySaved}
        onSave={handleSave}
        onManage={() => setModalOpen(true)}
      />
      {modalOpen && (
        <Modal
          savedTerms={savedTerms ?? {}}
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
