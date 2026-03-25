"use client"

import { useTodayCommitments, useCompleteCommitment, useCarryCommitment } from "@/hooks/use-commitments"
import { apiClient } from "@/lib/api-client"
import { useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, RotateCcw, XCircle, AlertTriangle } from "lucide-react"
import { INTENSITY_CONFIG } from "@/lib/constants"
import type { Intensity } from "@/lib/types"

export default function CommitmentsPage() {
  const { data: commitments, isLoading } = useTodayCommitments()
  const complete = useCompleteCommitment()
  const carry = useCarryCommitment()
  const qc = useQueryClient()

  async function handleDrop(id: string) {
    if (!window.confirm("Drop this commitment?")) return
    await apiClient.patch(`/commitments/${id}/drop`, {})
    qc.invalidateQueries({ queryKey: ["commitments"] })
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-6 h-20 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!commitments?.length) {
    return (
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-50">Today</h1>
        </div>
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-12 text-center">
          <p className="text-slate-400 text-sm">No declaration yet.</p>
          <a
            href="/declare"
            className="inline-block mt-4 bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-4 h-9 rounded-lg transition-colors text-sm leading-9"
          >
            Make your declaration
          </a>
        </div>
      </div>
    )
  }

  const pending = commitments.filter((c) => c.status === "pending")
  const done = commitments.filter((c) => c.status !== "pending")

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-50">Today</h1>
        <p className="text-sm text-slate-400 mt-1">
          {done.length}/{commitments.length} commitments closed
        </p>
      </div>

      <div className="space-y-3">
        {commitments.map((c) => {
          const intensityCfg = INTENSITY_CONFIG[c.intensity as Intensity]
          const isPending = c.status === "pending"

          return (
            <div
              key={c.id}
              className={`bg-[#111118] border border-[#1E1E2E] rounded-xl p-5 flex items-start justify-between gap-4 ${
                !isPending ? "opacity-50" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-medium ${isPending ? "text-slate-50" : "text-slate-400 line-through"}`}>
                    {c.title}
                  </p>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${intensityCfg.className}`}>
                    {intensityCfg.label}
                  </span>
                  {c.slip_count >= 3 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-400/10 text-amber-400 border border-amber-400/20">
                      <AlertTriangle className="w-3 h-3" />
                      Slipping
                    </span>
                  )}
                </div>
                {c.tag && (
                  <span className="text-xs text-slate-500 capitalize mt-1 block">{c.tag}</span>
                )}
              </div>

              {isPending && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => complete.mutate({ id: c.id })}
                    disabled={complete.isPending}
                    title="Complete"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-green-500 hover:bg-green-500/10 transition-colors"
                  >
                    <CheckCircle2 className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={() => carry.mutate(c.id)}
                    disabled={carry.isPending}
                    title="Carry to tomorrow"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDrop(c.id)}
                    title="Drop"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}

              {!isPending && (
                <span className="text-xs text-slate-500 capitalize shrink-0">{c.status}</span>
              )}
            </div>
          )
        })}
      </div>

      {pending.length === 0 && (
        <div className="mt-6 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
          <p className="text-sm text-green-400 text-center">All commitments closed. Time to debrief.</p>
          <div className="mt-3 text-center">
            <a
              href="/debrief"
              className="inline-block bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 font-medium px-4 h-9 rounded-lg transition-colors text-sm leading-9"
            >
              Write your debrief →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
