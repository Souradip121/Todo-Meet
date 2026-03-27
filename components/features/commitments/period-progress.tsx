"use client"

import { useRenewCommitment, useArchiveCommitment } from "@/hooks/use-recurring-commitments"
import type { RecurringCommitment } from "@/lib/types"

interface PeriodProgressProps {
  commitment: RecurringCommitment
  daysLogged: number
}

function daysUntil(dateStr: string) {
  const end = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function PeriodProgress({ commitment, daysLogged }: PeriodProgressProps) {
  const renew = useRenewCommitment(commitment.id)
  const archive = useArchiveCommitment()
  const remaining = daysUntil(commitment.end_date)
  const pct = Math.min(100, Math.round((daysLogged / commitment.period_days) * 100))

  const colorClass =
    commitment.color === "indigo"
      ? "bg-[var(--ink)]"
      : commitment.color === "amber"
        ? "bg-amber-400"
        : "bg-green-500"

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[var(--ink-muted)] uppercase tracking-wider">This Period</p>
        <p className="text-xs text-[var(--ink-faint)]">
          {daysLogged}/{commitment.period_days} days
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[var(--rule)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Renewal CTA */}
      {remaining <= 7 && (
        <div className={`rounded-xl p-4 border ${
          remaining <= 0
            ? "bg-amber-400/5 border-[rgba(146,64,14,0.2)]"
            : "bg-[var(--card-bg)] border-[var(--card-border)]"
        }`}>
          {remaining <= 0 ? (
            <>
              <p className="text-sm font-medium text-[var(--amber-ink)] mb-3">Your {commitment.period_days}-day commitment ended. Keep going?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => renew.mutate()}
                  disabled={renew.isPending}
                  className="bg-[var(--ink)] hover:bg-[var(--red-ink)] disabled:opacity-50 text-white text-sm font-medium h-9 px-4 rounded-lg transition-colors"
                >
                  {renew.isPending ? "Renewing…" : `Renew ${commitment.period_days} days →`}
                </button>
                <button
                  onClick={() => archive.mutate(commitment.id)}
                  disabled={archive.isPending}
                  className="text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--card-border)] hover:bg-[var(--paper-hover)] text-sm h-9 px-4 rounded-lg transition-colors"
                >
                  Archive
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs text-[var(--ink-faint)]">
              Period ends in {remaining} day{remaining !== 1 ? "s" : ""} — renewal coming up
            </p>
          )}
        </div>
      )}
    </div>
  )
}
