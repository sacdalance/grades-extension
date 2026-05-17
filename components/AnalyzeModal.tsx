import { useMemo, useState } from "react"
import {
  ComposedChart, Bar, Cell, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label,
  BarChart, PieChart, Pie
} from "recharts"
import { Settings } from "lucide-react"
import { Button } from "~components/ui/button"
import { SetupScreen } from "~components/ProjectionModal"
import type { Term } from "~types"
import { chronoOrder } from "~utils/calculator"

const UP_GRADES = [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 4.0, 5.0]

function gradeColor(g: number): string {
  if (g <= 1.75) return "#16a34a"
  if (g <= 3.0) return "#f59e0b"
  return "#f43f5e"
}

interface Props {
  savedTerms: Term[]
  termOrder: string[]
  totalUnits: number
  currentUnits: number
  onClose: () => void
  onSaveTotalUnits: (units: number) => void
}

function resolveOrder(termOrder: string[], savedTerms: Term[]): string[] {
  const allKeys = savedTerms.map(t => t.term)
  const stored = termOrder.filter(k => allKeys.includes(k))
  const added = allKeys.filter(k => !stored.includes(k)).sort((a, b) => chronoOrder(a) - chronoOrder(b))
  return [...stored, ...added]
}

export function AnalyzeModal({ savedTerms, termOrder, totalUnits, currentUnits, onClose, onSaveTotalUnits }: Props) {
  const [editingUnits, setEditingUnits] = useState(false)
  const [expandedGrade, setExpandedGrade] = useState<number | null>(null)
  const [barMode, setBarMode] = useState<"subjects" | "units">("subjects")
  const chartData = useMemo(() => {
    const orderedKeys = resolveOrder(termOrder, savedTerms)

    // Use the established termOrder to build the chart sequence
    const termsMap = savedTerms.reduce((acc, t) => {
      acc[t.term] = t
      return acc
    }, {} as Record<string, Term>)

    const orderedTerms = orderedKeys
      .map(name => termsMap[name])
      .filter(Boolean)
    let totalUnitsAcc = 0
    let totalGradePoints = 0

    return orderedTerms.map(t => {
      totalUnitsAcc += t.units
      totalGradePoints += t.gwa * t.units
      const cumGWA = totalGradePoints / totalUnitsAcc

      // Handle standard vs custom names
      let shortName = t.term
      const parts = t.term.split(" ")

      // Check if it matches standard "First Semester 2024-2025"
      const hasYear = parts[parts.length - 1].includes("-")
      if (hasYear && parts.length >= 2) {
        const yearRaw = parts[parts.length - 1]
        const yearParts = yearRaw.split("-")
        const shortYear = yearParts.map(y => y.slice(-2)).join("-")
        const sem = parts[0].toLowerCase().startsWith("f") ? "1st"
          : parts[0].toLowerCase().startsWith("s") ? "2nd"
            : "Mid"
        shortName = `${sem}_${shortYear}`
      } else if (shortName.length > 10) {
        shortName = shortName.slice(0, 8) + "..."
      }

      return {
        name: shortName,
        fullName: t.term,
        termGWA: parseFloat(t.gwa.toFixed(4)),
        cumGWA: parseFloat(cumGWA.toFixed(4)),
        units: t.units
      }
    })
  }, [savedTerms, termOrder])

  const completedPct = totalUnits > 0 ? Math.min(100, Math.round((currentUnits / totalUnits) * 100)) : 0
  const remainingUnits = Math.max(0, totalUnits - currentUnits)

  const insights = useMemo(() => {
    if (chartData.length === 0) return null
    const best = chartData.reduce((a, b) => a.termGWA <= b.termGWA ? a : b)
    const worst = chartData.reduce((a, b) => a.termGWA >= b.termGWA ? a : b)
    const honorsSems = chartData.filter(d => d.termGWA <= 1.75).length
    const half = Math.floor(chartData.length / 2)
    const firstHalfAvg = chartData.slice(0, half || 1).reduce((s, d) => s + d.termGWA, 0) / (half || 1)
    const secondHalfAvg = chartData.slice(half).reduce((s, d) => s + d.termGWA, 0) / (chartData.length - half)
    const diff = firstHalfAvg - secondHalfAvg
    const trend = chartData.length < 2 ? null : Math.abs(diff) < 0.05 ? "Stable" : diff < 0 ? "Improving" : "Declining"
    const trendColor = trend === "Improving" ? "text-upb-green" : trend === "Declining" ? "text-gray-900" : "text-gray-500"
    const maxUnits = Math.max(...chartData.map(d => d.units))
    const heaviest = chartData.filter(d => d.units === maxUnits).reduce((a, b) => a.termGWA <= b.termGWA ? a : b)
    const heaviestBetter = heaviest.termGWA <= heaviest.cumGWA
    return { best, worst, honorsSems, trend, trendColor, heaviest, heaviestBetter }
  }, [chartData])

  const breakdown = useMemo(() => {
    const counts: Record<number, number> = {}
    const unitsByGrade: Record<number, number> = {}
    const subjectsByGrade: Record<number, { code: string; term: string }[]> = {}
    UP_GRADES.forEach(g => { counts[g] = 0; unitsByGrade[g] = 0; subjectsByGrade[g] = [] })

    let total = 0
    let totalUnitsCount = 0
    for (const term of savedTerms) {
      for (const s of term.subjects) {
        if (s.gradeLabel || s.excludeFromGWA) continue
        const match = UP_GRADES.find(g => Math.abs(g - s.grade) < 0.01)
        if (match === undefined) continue
        counts[match]++
        unitsByGrade[match] += s.units
        subjectsByGrade[match].push({ code: s.code, term: term.term })
        total++
        totalUnitsCount += s.units
      }
    }

    const rows = UP_GRADES
      .filter(g => counts[g] > 0)
      .map(g => ({
        grade: g.toFixed(2),
        gradeNum: g,
        count: counts[g],
        units: unitsByGrade[g],
        pct: total > 0 ? Math.round((counts[g] / total) * 100) : 0,
        subjects: subjectsByGrade[g],
      }))

    const maxCount = Math.max(...UP_GRADES.filter(g => counts[g] > 0).map(g => counts[g]))
    const mostCommonGrades = UP_GRADES.filter(g => counts[g] === maxCount)
    const mostCommon = mostCommonGrades[0]
    const honorUnits = UP_GRADES.filter(g => g <= 1.75).reduce((s, g) => s + unitsByGrade[g], 0)
    const honorsPct = totalUnitsCount > 0 ? Math.round((honorUnits / totalUnitsCount) * 100) : 0
    const gradeRange = rows.length >= 2
      ? { min: rows[0].gradeNum, max: rows[rows.length - 1].gradeNum }
      : null

    return { rows, total, totalUnitsCount, mostCommon, mostCommonGrades, honorsPct, gradeRange }
  }, [savedTerms])

  return (
    <>
      <div
        className="pointer-events-auto flex items-center justify-center"
        style={{ position: "fixed", inset: 0, zIndex: 2147483648, background: "rgba(0,0,0,0.4)", animation: "gwa-fade 0.15s ease-out both" }}>

        <div
          className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
          style={{ width: "min(48rem, 96vw)", maxHeight: "85vh", animation: "gwa-slide-up 0.2s ease-out both" }}>

          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 shrink-0">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Academic Analysis</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Trend over {savedTerms.length} semesters</p>
            </div>
            <div className="flex items-center gap-0.5">
              <Button variant="icon" size="icon" onClick={() => setEditingUnits(true)}>
                <Settings size={13} />
              </Button>
              <Button variant="icon" size="icon" onClick={onClose} className="text-lg leading-none">×</Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
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

            <div className="px-5 py-6 space-y-6">
              <div className="space-y-1.5 pl-3 border-l-2 border-upb-green/30">
                <p className="text-[10px] font-semibold text-upb-maroon uppercase tracking-widest">
                  Trend Analysis
                </p>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  The trend reflects the order set in <span className="font-medium text-gray-700">Manage Data</span>.
                  Arrange your terms chronologically there for an accurate graph.
                </p>
              </div>

              {/* Main Chart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 40, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                    >
                      <Label value="Academic Term" offset={-15} position="insideBottom" fontSize={10} fill="#9ca3af" fontWeight={500} />
                    </XAxis>
                    <YAxis
                      domain={[1.0, 3.0]}
                      reversed
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                    >
                      <Label value="GWA" angle={-90} position="insideLeft" offset={-5} fontSize={10} fill="#9ca3af" fontWeight={500} />
                    </YAxis>
                    <Tooltip
                      contentStyle={{ fontSize: "11px", borderRadius: "0", border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                      itemStyle={{ padding: "0px" }}
                      cursor={{ stroke: '#f3f4f6', strokeWidth: 20 }}
                    />
                    <Bar
                      dataKey="termGWA"
                      name="Term GWA"
                      fill="#018040"
                      radius={0}
                      barSize={30}
                      opacity={0.3}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumGWA"
                      name="Cumulative GWA"
                      stroke="#018040"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#018040", strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Insights Grid */}
              {insights && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 items-start">
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">Peak Performance</p>
                      <p className="text-lg font-bold text-upb-green tabular-nums">{insights.best.termGWA.toFixed(4)}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate">{insights.best.fullName}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">Lowest GWA</p>
                      <p className="text-lg font-bold text-gray-900 tabular-nums">{insights.worst.termGWA.toFixed(4)}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate">{insights.worst.fullName}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">Trend</p>
                      <p className={`text-lg font-bold ${insights.trendColor}`}>{insights.trend ?? "—"}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Based on first vs second half</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 items-start">
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">Heaviest Term</p>
                      <p className="text-lg font-bold text-gray-700 tabular-nums">
                        {insights.heaviest.units} units
                        <span className={`text-xs font-normal ml-1.5 ${insights.heaviestBetter ? "text-upb-green" : "text-amber-500"}`}>
                          {insights.heaviestBetter ? "▲ held up" : "▼ dragged down"} (cumGWA: {insights.heaviest.cumGWA.toFixed(2)})
                        </span>
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate">{insights.heaviest.fullName} - {insights.heaviest.termGWA.toFixed(4)} GWA</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">Honors Semesters</p>
                      <p className="text-lg font-bold text-upb-green tabular-nums">{insights.honorsSems} <span className="text-sm font-normal text-gray-400">/ {chartData.length}</span></p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Terms with GWA [1.00, 1.75]</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {insights && (() => {
                const tips: { text: string; color: string }[] = []
                const { trend, honorsSems } = insights
                const lastCumGWA = chartData[chartData.length - 1]?.cumGWA

                if (trend === "Declining")
                  tips.push({ color: "#f59e0b", text: "Your GWA is trending downward. Consider adjusting your course load or study approach in upcoming terms." })
                else if (trend === "Improving")
                  tips.push({ color: "#16a34a", text: "Your grades are on an upward trend. Keep up the momentum going into your next semester." })
                else if (trend === "Stable")
                  tips.push({ color: "#9ca3af", text: "Your performance has been consistent. A focused push in upcoming terms could move you to the next honors tier." })

                if (lastCumGWA) {
                  if (lastCumGWA > 1.75 && lastCumGWA <= 2.10)
                    tips.push({ color: "#16a34a", text: `Your cumulative GWA is ${lastCumGWA.toFixed(4)}, just outside Cum Laude (≤ 1.75). Strong upcoming terms can close that gap.` })
                  else if (lastCumGWA > 1.45 && lastCumGWA <= 1.75)
                    tips.push({ color: "#16a34a", text: `You are within Cum Laude range. Targeting a GWA ≤ 1.45 in future terms would qualify you for Magna Cum Laude.` })
                  else if (lastCumGWA > 1.20 && lastCumGWA <= 1.45)
                    tips.push({ color: "#16a34a", text: `You are within Magna Cum Laude range. A few more strong semesters could bring you to Summa Cum Laude (≤ 1.20).` })
                  else if (lastCumGWA <= 1.20)
                    tips.push({ color: "#16a34a", text: `Excellent standing. Your cumulative GWA is within Summa Cum Laude range. Maintain this level of performance.` })
                }

                const failingCount = breakdown.rows.filter(r => r.gradeNum > 3.0).reduce((s, r) => s + r.count, 0)
                if (failingCount > 0)
                  tips.push({ color: "#f43f5e", text: `You have ${failingCount} subject${failingCount !== 1 ? "s" : ""} with a grade above 3.00. These are factored into your cumulative GWA.` })

                if (chartData.length >= 3 && honorsSems / chartData.length >= 0.75)
                  tips.push({ color: "#16a34a", text: `You qualified for honors in ${honorsSems} of ${chartData.length} terms. That is strong, consistent academic performance.` })

                if (tips.length === 0) return null
                return (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Suggestions</p>
                    {tips.map((tip, i) => (
                      <div key={i} className="flex items-stretch rounded-lg bg-gray-50 border border-gray-100 overflow-hidden">
                        <span className="w-1 shrink-0" style={{ background: tip.color }} />
                        <p className="text-[10px] text-gray-600 leading-relaxed p-3">{tip.text}</p>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Subject Breakdown */}
              {breakdown.total > 0 && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div className="pl-3 border-l-2 border-upb-green/30">
                    <p className="text-[10px] font-semibold text-upb-maroon uppercase tracking-widest">Subject Breakdown</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5">Grade distribution across all {breakdown.total} graded subjects.</p>
                  </div>

                  {/* Summary stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">Total Subjects</p>
                      <p className="text-lg font-bold text-upb-green tabular-nums">{breakdown.total}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{breakdown.totalUnitsCount} units</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">Most Common</p>
                      {breakdown.mostCommonGrades.length > 1 ? (
                        <>
                          <p className="text-lg font-bold text-gray-700 tabular-nums">Tied</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{breakdown.mostCommonGrades.map(g => g.toFixed(2)).join(", ")}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-bold tabular-nums" style={{ color: gradeColor(breakdown.mostCommon) }}>
                            {breakdown.mostCommon?.toFixed(2) ?? "—"}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">grade</p>
                        </>
                      )}
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">Honors Units</p>
                      <p className="text-lg font-bold text-upb-green tabular-nums">{breakdown.honorsPct}%</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">≤ 1.75 grades</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">Grade Range</p>
                      <p className="text-lg font-bold text-gray-700 tabular-nums">
                        {breakdown.gradeRange ? `${breakdown.gradeRange.min.toFixed(2)} – ${breakdown.gradeRange.max.toFixed(2)}` : "—"}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">best – worst</p>
                    </div>
                  </div>

                  {/* Pie (left) + Bar (right) */}
                  <div className="flex gap-3 h-44">
                    {/* Pie chart */}
                    <div className="shrink-0 w-40 flex flex-col">
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={breakdown.rows}
                              dataKey="count"
                              nameKey="grade"
                              cx="50%"
                              cy="50%"
                              innerRadius="45%"
                              outerRadius="65%"
                              stroke="white"
                              strokeWidth={2}
                            >
                              {breakdown.rows.map((d) => (
                                <Cell key={d.grade} fill={gradeColor(d.gradeNum)} opacity={0.85} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ fontSize: "11px", borderRadius: "0", border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                              position={{ x: 0, y: 0 }}
                              formatter={(value: number, _: string, props: any) => [
                                `${value} subject${value !== 1 ? "s" : ""} (${props.payload.pct}%)`,
                                `Grade ${props.payload.grade}`
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-col gap-1 mt-1">
                        {[
                          { color: "#16a34a", label: "[1.00, 1.75]", desc: "Honors" },
                          { color: "#f59e0b", label: "(1.75, 3.00]", desc: "Passing" },
                          { color: "#f43f5e", label: "(3.00, 5.00]", desc: "Failing" },
                        ].map(({ color, label, desc }) => (
                          <div key={label} className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: color }} />
                            <span className="text-[10px] text-gray-500">{desc} <span className="text-gray-400">{label}</span></span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bar chart */}
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-end mb-1">
                        <div className="flex text-[9px] border border-gray-200 overflow-hidden">
                          <button
                            className={`px-2 py-0.5 ${barMode === "subjects" ? "bg-upb-green text-white" : "text-gray-400 hover:bg-gray-50"}`}
                            onClick={() => setBarMode("subjects")}>Subjects</button>
                          <button
                            className={`px-2 py-0.5 ${barMode === "units" ? "bg-upb-green text-white" : "text-gray-400 hover:bg-gray-50"}`}
                            onClick={() => setBarMode("units")}>Units</button>
                        </div>
                      </div>
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={breakdown.rows} margin={{ top: 4, right: 8, left: -8, bottom: 22 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="grade" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }}>
                              <Label value="Grade" offset={-12} position="insideBottom" fontSize={10} fill="#9ca3af" fontWeight={500} />
                            </XAxis>
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false}>
                              <Label value={barMode === "subjects" ? "Subjects" : "Units"} angle={-90} position="insideLeft" offset={14} fontSize={10} fill="#9ca3af" fontWeight={500} />
                            </YAxis>
                            <Tooltip
                              contentStyle={{ fontSize: "11px", borderRadius: "0", border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                              itemStyle={{ padding: "0px" }}
                              cursor={{ fill: "#f9fafb" }}
                              formatter={(value: number, _: string, props: any) => [
                                barMode === "subjects"
                                  ? `${value} subject${value !== 1 ? "s" : ""} (${props.payload.pct}%)`
                                  : `${value} unit${value !== 1 ? "s" : ""}`,
                                `Grade ${props.payload.grade}`
                              ]}
                              labelFormatter={() => ""}
                            />
                            <Bar dataKey={barMode === "subjects" ? "count" : "units"} name={barMode === "subjects" ? "Subjects" : "Units"} radius={0} barSize={20}>
                              {breakdown.rows.map((d) => (
                                <Cell key={d.grade} fill={gradeColor(d.gradeNum)} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Detail rows */}
                  <div className="space-y-1.5 min-w-0">
                    {breakdown.rows.map((d) => (
                        <div key={d.grade}>
                          <button
                            className="flex w-full items-center gap-3 text-left rounded hover:bg-gray-50 transition-colors py-0.5 px-1 -mx-1"
                            onClick={() => setExpandedGrade(expandedGrade === d.gradeNum ? null : d.gradeNum)}>
                            <span className="w-9 shrink-0 text-[11px] font-semibold tabular-nums text-right" style={{ color: gradeColor(d.gradeNum) }}>
                              {d.grade}
                            </span>
                            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${d.pct}%`, background: gradeColor(d.gradeNum), opacity: 0.75 }}
                              />
                            </div>
                            <span className="shrink-0 text-[10px] text-gray-500 tabular-nums text-right whitespace-nowrap">
                              {d.count} subject{d.count !== 1 ? "s" : ""} · {d.units} unit{d.units !== 1 ? "s" : ""} ({d.pct}%)
                            </span>
                            <span className="text-[10px] text-gray-300 shrink-0">
                              {expandedGrade === d.gradeNum ? "▲" : "▼"}
                            </span>
                          </button>
                          {expandedGrade === d.gradeNum && (
                            <div className="ml-10 mt-1 mb-1 rounded-md border border-gray-100 bg-gray-50 divide-y divide-gray-100 overflow-hidden">
                              {d.subjects.map((s, i) => (
                                <div key={`${s.term}-${s.code}-${i}`} className="flex items-center justify-between px-3 py-1.5 gap-2">
                                  <span className="text-[11px] font-medium text-gray-700 truncate">{s.code}</span>
                                  <span className="text-[10px] text-gray-400 shrink-0 truncate max-w-[10rem]">{s.term}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {editingUnits && (
        <div
          className="pointer-events-auto flex items-center justify-center"
          style={{ position: "fixed", inset: 0, zIndex: 2147483649, background: "rgba(0,0,0,0.4)", animation: "gwa-fade 0.15s ease-out both" }}>
          <div
            className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
            style={{ width: "min(22rem, 92vw)", animation: "gwa-slide-up 0.2s ease-out both" }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Graduation Units</h2>
              <Button variant="icon" size="icon" onClick={() => setEditingUnits(false)} className="text-lg leading-none">×</Button>
            </div>
            <SetupScreen
              totalUnits={totalUnits}
              onSave={(v) => { onSaveTotalUnits(v); setEditingUnits(false) }}
              onCancel={() => setEditingUnits(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
