import { useState, useRef } from "react"
import { useStorage } from "@plasmohq/storage/hook"
import { Storage } from "@plasmohq/storage" // used by handleReset
import { Dashboard } from "~components/Dashboard"
import { Modal } from "~components/Modal"
import { AnalyzeModal } from "~components/AnalyzeModal"
import { TermsModal } from "~components/TermsModal"
import { useGradeScanner } from "~hooks/useGradeScanner"
import type { SavedTerms, Subject } from "~types"
import { calcCumulativeGWA, recalcTerms, chronoOrder } from "~utils/calculator"
import { scanAllTerms } from "~utils/scanner"

export function App() {
  const [modalOpen, setModalOpen] = useState(false)
  const [analyzeOpen, setAnalyzeOpen] = useState(false)
  const [termsAccepted, setTermsAccepted] = useStorage<boolean>("termsAccepted", (v) =>
    v === undefined ? false : v
  )
  const [graduationUnits, setGraduationUnits] = useStorage<number>("graduationUnits", (v) =>
    v === undefined ? 0 : v
  )

  const [savedTerms, setSavedTerms] = useStorage<SavedTerms>("savedTerms", (v) =>
    v === undefined ? {} : v
  )
  const terms = savedTerms ?? {}
  const savedTermsRef = useRef<SavedTerms>(terms)
  savedTermsRef.current = terms
  const [termOrder, setTermOrder] = useStorage<string[]>("termOrder", (v) =>
    v === undefined ? [] : v
  )
  const [whatIfTerms, setWhatIfTerms] = useStorage<import("~types").WhatIfTerm[]>("whatIfTerms", (v) =>
    Array.isArray(v) ? v : []
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

  const handleCreateTerm = async (name: string, subjectCount = 0) => {
    if (savedTermsRef.current[name]) return false
    if (Object.keys(savedTermsRef.current).length >= 20) return false
    const subjects = Array.from({ length: Math.min(subjectCount, 20) }, () => ({ code: "New Subject", units: 3, grade: 1.0 }))
    await persist({ ...savedTermsRef.current, [name]: { term: name, units: 0, gwa: 0, subjects } })
    await setTermOrder([...(termOrder ?? []), name])
    return true
  }

  const handleRenameTerm = async (oldKey: string, newKey: string) => {
    const current = savedTermsRef.current
    if (!current[oldKey] || current[newKey]) return
    const updated = { ...current, [newKey]: { ...current[oldKey], term: newKey } }
    delete updated[oldKey]
    await persist(updated)
    await setTermOrder((termOrder ?? []).map(k => k === oldKey ? newKey : k))
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
    if (terms[termKey].subjects.length >= 20) return
    terms[termKey] = {
      ...terms[termKey],
      subjects: [...terms[termKey].subjects, { code: "New Subject", units: 3, grade: 1.0 }]
    }
    await persist(terms)
  }

  const handleScanAll = async (
    onProgress: (current: string, done: number, total: number) => void
  ): Promise<import("~types").CurrentData[]> => {
    return await scanAllTerms(onProgress)
  }

  const savingScan = useRef(false)
  const handleSaveScan = async (results: import("~types").CurrentData[]): Promise<number> => {
    if (results.length === 0 || savingScan.current) return 0
    savingScan.current = true
    try {
      const newTerms = { ...savedTermsRef.current }
      const newOrder = [...(termOrder ?? [])]
      for (const data of results) {
        if (!newTerms[data.term]) newOrder.push(data.term)
        newTerms[data.term] = { term: data.term, units: data.units, gwa: data.gwa, subjects: data.subjects }
      }
      await persist(newTerms)
      await setTermOrder(newOrder.sort((a, b) => chronoOrder(a) - chronoOrder(b)))
      return results.length
    } finally {
      savingScan.current = false
    }
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
        savedTerms={terms}
        graduationUnits={graduationUnits ?? 0}
        onSaveTotalUnits={async (v) => { await setGraduationUnits(v) }}
        status={status}
        saveState={saveState}
        onSave={handleSave}
        onManage={() => setModalOpen(true)}
        onScanAll={handleScanAll}
        onSaveScan={handleSaveScan}
        whatIfTerms={whatIfTerms ?? []}
        onSaveWhatIfTerms={async (t) => { await setWhatIfTerms(t) }}
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
          onRenameTerm={handleRenameTerm}
          onCreateTerm={handleCreateTerm}
          onSaveOrder={handleSaveOrder}
          onImport={handleImport}
          onReset={handleReset}
          onAnalyze={() => setAnalyzeOpen(true)}
        />
      )}

      {analyzeOpen && (
        <AnalyzeModal
          savedTerms={Object.values(terms)}
          termOrder={termOrder ?? []}
          totalUnits={graduationUnits ?? 0}
          currentUnits={cumulative.units}
          onClose={() => setAnalyzeOpen(false)}
          onSaveTotalUnits={async (v) => { await setGraduationUnits(v) }}
        />
      )}
      {termsAccepted === false && (
        <TermsModal onClose={() => setTermsAccepted(true)} />
      )}
    </>
  )
}
