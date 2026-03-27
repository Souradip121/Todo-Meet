"use client"

import { useState } from "react"
import { useLogTime } from "@/hooks/use-recurring-commitments"
import type { TodayCommitment } from "@/lib/types"

const QUICK_PILLS = [
  { label: "15m", value: 15 },
  { label: "30m", value: 30 },
  { label: "45m", value: 45 },
  { label: "1h", value: 60 },
  { label: "1.5h", value: 90 },
  { label: "2h", value: 120 },
]

interface LogFormProps {
  commitment: TodayCommitment | { id: string; target_min_day: number | null }
  defaultDate?: "today" | "yesterday"
  existingMinutes?: number | null
  onSaved?: () => void
}

export function LogForm({ commitment, defaultDate = "today", existingMinutes, onSaved }: LogFormProps) {
  const [tab, setTab] = useState<"today" | "yesterday">(defaultDate)
  const [minutes, setMinutes] = useState<string>(existingMinutes ? String(existingMinutes) : "")
  const [timeStart, setTimeStart] = useState("")
  const [timeEnd, setTimeEnd] = useState("")
  const [note, setNote] = useState("")
  const [showTimeRange, setShowTimeRange] = useState(false)
  const logTime = useLogTime(commitment.id)

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)
  const todayStr = new Date().toISOString().slice(0, 10)

  function handleQuickPill(val: number) {
    setMinutes(String(val))
  }

  function handleSave() {
    const mins = parseInt(minutes)
    if (!mins || mins <= 0) return
    logTime.mutate(
      {
        date: tab === "today" ? todayStr : yesterdayStr,
        duration_minutes: mins,
        time_start: showTimeRange && timeStart ? timeStart : undefined,
        time_end: showTimeRange && timeEnd ? timeEnd : undefined,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          setMinutes("")
          setNote("")
          setTimeStart("")
          setTimeEnd("")
          onSaved?.()
        },
      }
    )
  }

  return (
    <div className="space-y-3">
      {/* Today / Yesterday tabs */}
      <div className="flex gap-1 bg-[var(--paper)] rounded-lg p-0.5 w-fit">
        {(["today", "yesterday"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t
                ? "bg-[var(--card-bg)] text-[var(--ink)] border border-[var(--card-border)]"
                : "text-[var(--ink-faint)] hover:text-[var(--ink)]"
            }`}
          >
            {t === "today" ? "Today" : "Yesterday"}
          </button>
        ))}
      </div>

      {/* Quick pills */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_PILLS.map((p) => (
          <button
            key={p.value}
            onClick={() => handleQuickPill(p.value)}
            className={`px-2.5 py-1 rounded-lg text-xs transition-colors border ${
              minutes === String(p.value)
                ? "bg-[rgba(185,28,28,0.1)] text-[var(--red-ink)] border-[rgba(185,28,28,0.4)]"
                : "bg-[var(--paper)] text-[var(--ink-muted)] border-[var(--card-border)] hover:text-[var(--ink)] hover:border-[var(--card-border)]"
            }`}
          >
            {p.label}
          </button>
        ))}
        {/* Custom input */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="custom"
            min={1}
            className="w-20 bg-[var(--paper)] border border-[var(--card-border)] text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[rgba(185,28,28,0.5)] focus:outline-none rounded-lg h-7 px-2 text-xs"
          />
          <span className="text-xs text-[var(--ink-faint)]">min</span>
        </div>
      </div>

      {/* Optional time range */}
      <button
        onClick={() => setShowTimeRange(!showTimeRange)}
        className="text-xs text-[var(--ink-faint)] hover:text-[var(--ink-muted)] transition-colors"
      >
        {showTimeRange ? "− Hide time range" : "+ Add start/end time (optional)"}
      </button>

      {showTimeRange && (
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={timeStart}
            onChange={(e) => setTimeStart(e.target.value)}
            className="bg-[var(--paper)] border border-[var(--card-border)] text-[var(--ink)] focus:border-[rgba(185,28,28,0.5)] focus:outline-none rounded-lg h-8 px-2 text-xs"
          />
          <span className="text-xs text-[var(--ink-faint)]">to</span>
          <input
            type="time"
            value={timeEnd}
            onChange={(e) => setTimeEnd(e.target.value)}
            className="bg-[var(--paper)] border border-[var(--card-border)] text-[var(--ink)] focus:border-[rgba(185,28,28,0.5)] focus:outline-none rounded-lg h-8 px-2 text-xs"
          />
        </div>
      )}

      {/* Note */}
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        maxLength={200}
        className="w-full bg-[var(--paper)] border border-[var(--card-border)] text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[rgba(185,28,28,0.5)] focus:outline-none rounded-lg h-9 px-3 text-sm"
      />

      <button
        onClick={handleSave}
        disabled={!minutes || parseInt(minutes) <= 0 || logTime.isPending}
        className="bg-[var(--ink)] hover:bg-[var(--red-ink)] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium h-9 px-5 rounded-lg transition-colors"
      >
        {logTime.isPending ? "Saving…" : existingMinutes ? "Update" : "Log"}
      </button>
    </div>
  )
}
