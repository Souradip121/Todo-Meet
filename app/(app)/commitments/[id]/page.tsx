"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Flame, Copy, Check } from "lucide-react"
import {
  useCommitment,
  useCommitmentStats,
  useShareCommitment,
} from "@/hooks/use-recurring-commitments"
import { CommitmentHeatmap } from "@/components/features/commitments/commitment-heatmap"
import { LogForm } from "@/components/features/commitments/log-form"
import { WeeklyChart } from "@/components/features/commitments/weekly-chart"
import { MonthlyChart } from "@/components/features/commitments/monthly-chart"
import { PeriodProgress } from "@/components/features/commitments/period-progress"
import type { TodayCommitment } from "@/lib/types"

function calcStreak(logs: { date: string }[]) {
  if (logs.length === 0) return 0
  const present = new Set(logs.map((l) => l.date))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streak = 0
  for (let i = 0; i <= 400; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (present.has(key)) {
      streak++
    } else if (i > 0) {
      break
    }
  }
  return streak
}

function fmtMinutes(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function fmtHours(mins: number) {
  return (mins / 60).toFixed(1) + "h"
}

export default function CommitmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, isPending } = useCommitment(id)
  const { data: weekly } = useCommitmentStats(id, "weekly")
  const { data: monthly } = useCommitmentStats(id, "monthly")
  const share = useShareCommitment(id)
  const [copied, setCopied] = useState(false)

  function handleShare() {
    share.mutate(undefined, {
      onSuccess: (res) => {
        const url = `${window.location.origin}/share/${res.token}`
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
    })
  }

  if (isPending) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 animate-pulse h-24" />
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto">
        <p className="text-sm text-[var(--red-ink)]">Commitment not found.</p>
      </div>
    )
  }

  const { commitment, logs } = data
  const streak = calcStreak(logs)
  const totalMins = logs.reduce((s, l) => s + l.duration_minutes, 0)
  const avgMins = logs.length > 0 ? Math.round(totalMins / logs.length) : 0

  // Today's log if any
  const todayStr = new Date().toISOString().slice(0, 10)
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const todayLog = logs.find((l) => l.date === todayStr)
  const yesterdayLog = logs.find((l) => l.date === yesterdayStr)

  // Cast for LogForm
  const asToday: TodayCommitment = {
    ...commitment,
    today_logged: !!todayLog,
    today_minutes: todayLog?.duration_minutes ?? null,
    today_time_start: todayLog?.time_start ?? null,
    today_time_end: todayLog?.time_end ?? null,
    today_note: todayLog?.note ?? null,
  }

  const endDate = new Date(commitment.end_date)
  const startDate = new Date(commitment.start_date)
  const periodLabel = `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} → ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => router.push("/commitments")}
        className="flex items-center gap-2 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Commitments
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{commitment.emoji}</span>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--ink)]">{commitment.name}</h1>
            <p className="text-xs text-[var(--ink-faint)] mt-0.5">{commitment.period_days}d · {periodLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {streak > 0 && (
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[var(--amber-ink)]" />
              <span className="text-sm font-mono font-medium text-[var(--ink)]">{streak}</span>
            </div>
          )}
          <button
            onClick={handleShare}
            disabled={share.isPending}
            className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--card-border)] hover:bg-[var(--paper-hover)] h-8 px-3 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-[var(--green-ink)]" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Share"}
          </button>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 mb-4">
        <CommitmentHeatmap logs={logs} color={commitment.color} />
        <div className="flex items-center gap-3 mt-4">
          <span className="text-xs text-[var(--ink-faint)]">Less</span>
          {[0, 1, 2, 3, 4, 5].map((s) => (
            <div key={s} className={`w-3.5 h-3.5 rounded-sm ${
              s === 0 ? "bg-zinc-900" : s === 1 ? "bg-green-950" : s === 2 ? "bg-green-800" :
              s === 3 ? "bg-green-600" : s === 4 ? "bg-green-500" : "bg-amber-400"
            }`} />
          ))}
          <span className="text-xs text-[var(--ink-faint)]">More</span>
        </div>
      </div>

      {/* Log form */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 mb-4">
        <p className="text-xs font-medium text-[var(--ink-muted)] uppercase tracking-wider mb-4">Log time</p>
        <LogForm commitment={asToday} existingMinutes={todayLog?.duration_minutes} />
      </div>

      {/* Period progress */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 mb-4">
        <PeriodProgress commitment={commitment} daysLogged={logs.length} />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-[var(--card-border)]">
          <div>
            <p className="text-xs text-[var(--ink-faint)]">Total</p>
            <p className="text-lg font-mono font-semibold text-[var(--ink)]">{fmtHours(totalMins)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--ink-faint)]">Avg / day</p>
            <p className="text-lg font-mono font-semibold text-[var(--ink)]">{fmtMinutes(avgMins)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--ink-faint)]">Days logged</p>
            <p className="text-lg font-mono font-semibold text-[var(--ink)]">{logs.length}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 mb-4">
        <p className="text-xs font-medium text-[var(--ink-muted)] uppercase tracking-wider mb-4">Weekly</p>
        <WeeklyChart data={weekly ?? []} color={commitment.color} />
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
        <p className="text-xs font-medium text-[var(--ink-muted)] uppercase tracking-wider mb-4">Monthly</p>
        <MonthlyChart data={monthly ?? []} color={commitment.color} />
      </div>
    </div>
  )
}
