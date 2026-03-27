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

  useEffect(() => {
    if (status === "idle" && commitment_id && elapsed_sec > 0) {
      apiClient.patch(`/commitments/${commitment_id}/focus`, { seconds: elapsed_sec }).catch(() => {})
    }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  function startTimer() {
    if (!selected) return
    actions.start(selected.id, selected.title, mode)
  }

  const display = mode === "pomodoro" ? fmt(Math.max(0, total_sec - elapsed_sec)) : fmt(elapsed_sec)

  return (
    <div className="max-w-lg mx-auto">
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "2rem", fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.02em" }}>Focus</h1>
        <p style={{ fontFamily: "var(--font-lora), serif", fontSize: "0.9rem", color: "var(--ink-muted)", marginTop: "0.3rem" }}>Deep work, one commitment at a time.</p>
      </div>

      <div className="flex flex-col items-center gap-10">
        <FocusRing elapsed_sec={elapsed_sec} total_sec={mode === "pomodoro" ? total_sec : 25 * 60} size={220}>
          <div className="flex flex-col items-center">
            <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "2.8rem", fontWeight: 500, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
              {display}
            </span>
            {commitment_title && (
              <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: "var(--ink-faint)", marginTop: "0.5rem", textAlign: "center", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {commitment_title}
              </span>
            )}
          </div>
        </FocusRing>

        {!idle && <TimerControls />}

        {idle && (
          <div className="w-full space-y-6">
            <div className="flex" style={{ border: "1.5px solid var(--card-border)" }}>
              {(["pomodoro", "freeform"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className="flex-1 h-9 text-xs transition-colors"
                  style={{
                    fontFamily: "var(--font-ibm-mono), monospace", letterSpacing: "0.05em",
                    background: mode === m ? "var(--ink)" : "var(--card-bg)",
                    color: mode === m ? "var(--paper)" : "var(--ink-muted)",
                    border: "none", cursor: "pointer",
                  }}>
                  {m === "pomodoro" ? "Pomodoro (25m)" : "Freeform"}
                </button>
              ))}
            </div>

            <div>
              <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.75rem" }}>
                Which commitment?
              </p>
              {pending.length === 0 ? (
                <p style={{ fontFamily: "var(--font-lora), serif", fontSize: "0.9rem", color: "var(--ink-muted)", textAlign: "center", padding: "1rem" }}>No pending commitments today.</p>
              ) : (
                <div className="space-y-2">
                  {pending.map((c) => (
                    <button key={c.id} onClick={() => setSelected(c)} className="w-full text-left px-4 py-3 transition-colors"
                      style={{
                        background: selected?.id === c.id ? "rgba(185,28,28,0.06)" : "var(--card-bg)",
                        border: selected?.id === c.id ? "1.5px solid rgba(185,28,28,0.4)" : "1.5px solid var(--card-border)",
                        fontFamily: "var(--font-lora), serif", fontSize: "0.9rem", color: "var(--ink)", cursor: "pointer",
                      }}>
                      {c.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={startTimer} disabled={!selected || pending.length === 0}
              className="w-full flex items-center justify-center gap-2"
              style={{
                background: "var(--ink)", color: "var(--paper)", border: "none", height: "2.6rem",
                fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.82rem", letterSpacing: "0.05em",
                cursor: !selected || pending.length === 0 ? "not-allowed" : "pointer",
                opacity: !selected || pending.length === 0 ? 0.4 : 1,
              }}>
              <Play className="w-4 h-4" />
              Start session
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
