"use client"

import { useState } from "react"
import Link from "next/link"
import { Flame, Plus, ChevronDown, ChevronUp, Check } from "lucide-react"
import { useTodayCommitments } from "@/hooks/use-recurring-commitments"
import { LogForm } from "@/components/features/commitments/log-form"
import type { TodayCommitment } from "@/lib/types"

function calcStreak(commitmentId: string, todayLogged: boolean) {
  // Streak is server-side; we show from the commitment data
  return todayLogged ? "✓" : null
}

export default function TodayPage() {
  const { data: commitments, isPending } = useTodayCommitments()
  const [expanded, setExpanded] = useState<string | null>(null)

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  })

  if (isPending) {
    return (
      <div className="max-w-lg mx-auto space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-6 animate-pulse h-20" />
        ))}
      </div>
    )
  }

  if (!commitments || commitments.length === 0) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-50">Today</h1>
          <p className="text-sm text-slate-400 mt-1">{today}</p>
        </div>
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-12 flex flex-col items-center gap-3">
          <p className="text-sm text-slate-400">No active commitments yet.</p>
          <Link
            href="/commitments"
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Create your first commitment →
          </Link>
        </div>
      </div>
    )
  }

  const loggedCount = commitments.filter((c) => c.today_logged).length

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Today</h1>
          <p className="text-sm text-slate-400 mt-1">{today}</p>
        </div>
        <p className="text-sm font-mono text-slate-400 mt-1">
          {loggedCount}/{commitments.length}
        </p>
      </div>

      <div className="space-y-3">
        {commitments.map((c: TodayCommitment) => (
          <div
            key={c.id}
            className={`bg-[#111118] border rounded-xl overflow-hidden transition-colors ${
              c.today_logged ? "border-[#1E1E2E]" : "border-[#1E1E2E]"
            }`}
          >
            {/* Header row */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">{c.emoji}</span>
                <div>
                  <p className="text-sm font-medium text-slate-50">{c.name}</p>
                  {c.today_logged && c.today_minutes ? (
                    <p className="text-xs text-green-500 mt-0.5 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {c.today_minutes >= 60
                        ? `${Math.floor(c.today_minutes / 60)}h ${c.today_minutes % 60 > 0 ? `${c.today_minutes % 60}m` : ""}`
                        : `${c.today_minutes} min`}
                      {c.today_note && <span className="text-slate-500"> · {c.today_note}</span>}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-600 mt-0.5">Not logged yet</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className={`flex items-center gap-1.5 text-xs font-medium h-7 px-3 rounded-lg transition-colors ${
                  c.today_logged
                    ? "text-slate-500 hover:text-slate-300 border border-[#1E1E2E] hover:bg-[#16161F]"
                    : "bg-indigo-500 hover:bg-indigo-600 text-white"
                }`}
              >
                {c.today_logged ? (
                  <>Edit {expanded === c.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</>
                ) : (
                  <>
                    <Plus className="w-3 h-3" />
                    Log
                  </>
                )}
              </button>
            </div>

            {/* Expandable log form */}
            {expanded === c.id && (
              <div className="px-5 pb-5 border-t border-[#1E1E2E] pt-4">
                <LogForm
                  commitment={c}
                  existingMinutes={c.today_minutes}
                  onSaved={() => setExpanded(null)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Link
          href="/commitments"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Flame className="w-4 h-4" />
          View all commitments
        </Link>
      </div>
    </div>
  )
}
