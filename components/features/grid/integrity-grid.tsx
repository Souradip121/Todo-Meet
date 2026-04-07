"use client"

import { SCORE_CLASSES } from "@/lib/constants"
import type { DayScore } from "@/lib/types"

interface IntegrityGridProps {
  days: DayScore[]
  onDayClick: (day: DayScore) => void
}

// Build a 365-day array ending today
function buildCalendar(days: DayScore[]): { date: string; score: DayScore | null }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const scoreMap = new Map(days.map((d) => [d.date, d]))

  const result: { date: string; score: DayScore | null }[] = []
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    result.push({ date: key, score: scoreMap.get(key) ?? null })
  }
  return result
}

function getMonthLabels(calendar: { date: string }[], firstDow: number): { col: number; label: string }[] {
  const labels: { col: number; label: string }[] = []
  let lastMonth = -1
  calendar.forEach((day, idx) => {
    const m = new Date(day.date).getUTCMonth()
    const col = Math.floor((idx + firstDow) / 7)
    if (m !== lastMonth) {
      labels.push({ col, label: new Date(day.date).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }) })
      lastMonth = m
    }
  })
  return labels
}

export function IntegrityGrid({ days, onDayClick }: IntegrityGridProps) {
  const today = new Date().toISOString().slice(0, 10)
  const calendar = buildCalendar(days)
  const firstDow = new Date(calendar[0].date + "T00:00:00").getDay()
  const monthLabels = getMonthLabels(calendar, firstDow)

  // Pad start so week starts on Sunday aligned with first day
  const padded = Array(firstDow).fill(null).concat(calendar)

  return (
    <div className="overflow-x-auto">
      {/* Month labels */}
      <div className="flex mb-1">
        {monthLabels.map(({ col, label }, i) => {
          const prevCol = i === 0 ? 0 : monthLabels[i - 1].col
          const ml = (col - prevCol) * 17
          return (
            <div
              key={`${col}-${label}`}
              className="text-xs text-slate-600 shrink-0"
              style={{ width: 17, marginLeft: ml }}
            >
              {label}
            </div>
          )
        })}
      </div>

      {/* Grid */}
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateRows: "repeat(7, 14px)", gridAutoFlow: "column", gridAutoColumns: "14px" }}
      >
        {padded.map((cell, idx) => {
          if (!cell) {
            return <div key={`pad-${idx}`} className="w-[14px] h-[14px]" />
          }
          const { date, score } = cell
          const scoreVal = score?.score ?? 0
          const isToday = date === today
          const isPerfect = scoreVal === 5

          return (
            <button
              key={date}
              onClick={() => score && onDayClick(score)}
              title={`${date} — score ${scoreVal}`}
              className={`w-[14px] h-[14px] transition-transform ${SCORE_CLASSES[scoreVal]} ${
                isToday ? "ring-1 ring-[var(--red-ink)]/50" : ""
              } ${isPerfect ? "hover:scale-105" : ""} ${score ? "cursor-pointer" : "cursor-default"}`}
            />
          )
        })}
      </div>
    </div>
  )
}
