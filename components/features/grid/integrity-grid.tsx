"use client"

import { SCORE_CLASSES } from "@/lib/constants"
import type { DayScore } from "@/lib/types"

interface IntegrityGridProps {
  days: DayScore[]
  onDayClick: (day: DayScore) => void
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** Format a Date as local YYYY-MM-DD (no UTC conversion) */
function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// Build a 365-day array ending today (all dates in local timezone)
function buildCalendar(days: DayScore[]): { date: string; score: DayScore | null }[] {
  const scoreMap = new Map(days.map((d) => [d.date, d]))
  const result: { date: string; score: DayScore | null }[] = []

  for (let i = 364; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = localDate(d)
    result.push({ date: key, score: scoreMap.get(key) ?? null })
  }
  return result
}

function getMonthLabels(calendar: { date: string }[], firstDow: number): { col: number; label: string }[] {
  const labels: { col: number; label: string }[] = []
  let lastMonth = -1
  calendar.forEach((day, idx) => {
    // Parse month directly from the string to avoid any timezone conversion
    const m = parseInt(day.date.slice(5, 7)) - 1
    const col = Math.floor((idx + firstDow) / 7)
    if (m !== lastMonth) {
      labels.push({ col, label: MONTHS[m] })
      lastMonth = m
    }
  })
  return labels
}

export function IntegrityGrid({ days, onDayClick }: IntegrityGridProps) {
  const todayStr = localDate(new Date())
  const calendar = buildCalendar(days)
  const firstDow = new Date(calendar[0].date + "T00:00:00").getDay()
  const monthLabels = getMonthLabels(calendar, firstDow)

  const padded = Array(firstDow).fill(null).concat(calendar)

  return (
    <div className="overflow-x-auto">
      {/* Month labels — positioned absolutely so each label sits at col * 17px */}
      <div className="relative mb-1" style={{ height: 16 }}>
        {monthLabels.map(({ col, label }) => (
          <div
            key={`${col}-${label}`}
            className="absolute text-xs text-slate-600"
            style={{ left: col * 17 }}
          >
            {label}
          </div>
        ))}
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
          const isToday = date === todayStr
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
