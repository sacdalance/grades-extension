import { useEffect, useState } from "react"
import type { CurrentData } from "~types"
import { scanGradesFromPage } from "~utils/scanner"

const DEBOUNCE_MS = 300

const EMPTY: CurrentData = { units: 0, gwa: 0, term: "Unknown Term", subjects: [] }

export function useGradeScanner() {
  const [data, setData] = useState<CurrentData>(EMPTY)
  const [status, setStatus] = useState("")

  useEffect(() => {
    const scan = () => {
      const result = scanGradesFromPage()
      if (result) setData(result)
    }

    scan()

    let timer: ReturnType<typeof setTimeout>
    const observer = new MutationObserver(() => {
      clearTimeout(timer)
      timer = setTimeout(scan, DEBOUNCE_MS)
    })

    observer.observe(document.querySelector("#app") ?? document.body, {
      childList: true,
      subtree: true
    })

    return () => {
      observer.disconnect()
      clearTimeout(timer)
    }
  }, [])

  return { data, status, setStatus }
}
