"use client"

import Link from "next/link"
import { Flame } from "lucide-react"
import { CommitmentHeatmap } from "./commitment-heatmap"
import type { RecurringCommitment, CommitmentLog } from "@/lib/types"

interface CommitmentCardProps {
  commitment: RecurringCommitment
  logs?: CommitmentLog[]
  streak?: number
}

function daysUntil(dateStr: string) {
  const end = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function CommitmentCard({ commitment, logs = [], streak = 0 }: CommitmentCardProps) {
  const remaining = daysUntil(commitment.end_date)
  const endLabel = remaining <= 0 ? "Ended" : `ends ${new Date(commitment.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`

  return (
    <Link
      href={`/commitments/${commitment.id}`}
      className="block bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[rgba(185,28,28,0.3)] rounded-xl p-6 transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{commitment.emoji}</span>
          <div>
            <p className="text-sm font-medium text-[var(--ink)]">{commitment.name}</p>
            <p className="text-xs text-[var(--ink-faint)]">{commitment.period_days}d · {endLabel}</p>
          </div>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <Flame className="w-3.5 h-3.5 text-[var(--amber-ink)]" />
            <span className="text-xs font-mono font-medium text-[var(--ink)]">{streak}</span>
          </div>
        )}
      </div>

      {/* Mini heatmap — last 8 weeks (56 days of logs) */}
      <div className="overflow-hidden opacity-80">
        <CommitmentHeatmap logs={logs.slice(-56)} />
      </div>
    </Link>
  )
}
