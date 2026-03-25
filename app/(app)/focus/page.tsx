"use client"

import { useEffect, useState } from "react"
import { useTimerStore, useTimerActions } from "@/store/timer"
import { FocusRing } from "@/components/features/timer/focus-ring"
import { TimerControls } from "@/components/features/timer/timer-controls"
import { useTodayCommitments } from "@/hooks/use-commitments"
import { apiClient } from "@/lib/api-client"
import { Play } from "lucide-react"
import type { Commitment } from "@/lib/types"

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default function FocusPage() {
  const { data: commitments } = useTodayCommitments()
  const { status, elapsed_sec, total_sec, commitment_id, commitment_title } = useTimerStore()
  const actions = useTimerActions()

  const [selected, setSelected] = useState<Commitment | null>(null)
  const [mode, setMode] = useState<"pomodoro" | "freeform">("pomodoro")

  const pending = commitments?.filter((c) => c.status === "pending") ?? []
  const idle = status === "idle"

  // Log focus time when timer stops
  useEffect(() => {
    if (status === "idle" && commitment_id && elapsed_sec > 0) {
      apiClient.patch(`/commitments/${commitment_id}/focus`, { seconds: elapsed_sec })
        .catch(() => {}) // non-critical
    }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  function startTimer() {
    if (!selected) return
    actions.start(selected.id, selected.title, mode)
  }

  const display = mode === "pomodoro"
    ? fmt(Math.max(0, total_sec - elapsed_sec))
    : fmt(elapsed_sec)

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-50">Focus</h1>
        <p className="text-sm text-slate-400 mt-1">Deep work, one commitment at a time.</p>
      </div>

      <div className="flex flex-col items-center gap-10">
        {/* Ring */}
        <FocusRing
          elapsed_sec={elapsed_sec}
          total_sec={mode === "pomodoro" ? total_sec : (25 * 60)}
          size={220}
        >
          <div className="flex flex-col items-center">
            <span className="text-5xl font-semibold font-mono text-slate-50 tabular-nums">
              {display}
            </span>
            {commitment_title && (
              <span className="text-xs text-slate-500 mt-2 text-center max-w-[140px] truncate">
                {commitment_title}
              </span>
            )}
          </div>
        </FocusRing>

        {/* Controls when running */}
        {!idle && <TimerControls />}

        {/* Setup when idle */}
        {idle && (
          <div className="w-full space-y-6">
            {/* Mode toggle */}
            <div className="flex items-center gap-2 p-1 bg-[#111118] border border-[#1E1E2E] rounded-lg">
              {(["pomodoro", "freeform"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 h-8 rounded-md text-sm transition-colors capitalize ${
                    mode === m
                      ? "bg-indigo-500/10 text-indigo-400"
                      : "text-slate-500 hover:text-slate-400"
                  }`}
                >
                  {m === "pomodoro" ? "Pomodoro (25m)" : "Freeform"}
                </button>
              ))}
            </div>

            {/* Commitment selector */}
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                Which commitment?
              </p>
              {pending.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No pending commitments today.</p>
              ) : (
                <div className="space-y-2">
                  {pending.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors text-sm ${
                        selected?.id === c.id
                          ? "border-indigo-500/40 bg-indigo-500/10 text-slate-50"
                          : "border-[#1E1E2E] bg-[#111118] text-slate-300 hover:border-[#2a2a3e]"
                      }`}
                    >
                      {c.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={startTimer}
              disabled={!selected || pending.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium h-10 rounded-lg transition-colors text-sm"
            >
              <Play className="w-4 h-4" />
              Start session
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
