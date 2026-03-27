"use client"

import { useState } from "react"
import { Pencil, Check, X, Shield } from "lucide-react"
import { useGrid } from "@/hooks/use-grid"
import { useStreaks, useFreezeStreak } from "@/hooks/use-streaks"
import { useGridStore } from "@/store/grid"
import { IntegrityGrid } from "@/components/features/grid/integrity-grid"
import { GridTagFilter } from "@/components/features/grid/grid-tag-filter"
import { StatCard } from "@/components/ui/stat-card"
import { useSession, updateProfile } from "@/lib/auth-client"
import { useActiveSessions } from "@/hooks/use-sessions"
import type { DayScore } from "@/lib/types"

export default function DashboardPage() {
  const activeTag = useGridStore((s) => s.active_tag)
  const { data: days = [], isLoading } = useGrid(activeTag === "all" ? undefined : activeTag)
  const { data: streaks } = useStreaks()
  const { data: session } = useSession()
  const [selectedDay, setSelectedDay] = useState<DayScore | null>(null)
  const freezeStreak = useFreezeStreak()
  const { data: activeSessions } = useActiveSessions()
  const [editingFocus, setEditingFocus] = useState(false)
  const [focusInput, setFocusInput] = useState("")
  const [savingFocus, setSavingFocus] = useState(false)

  const currentFocus = session?.user?.current_focus
  const last7 = days.slice(-7)
  const completionPct = last7.length
    ? Math.round(last7.reduce((sum, d) => sum + d.score, 0) / (last7.length * 5) * 100)
    : 0
  const perfectDays = days.filter((d) => d.score === 5).length

  async function saveFocus() {
    setSavingFocus(true)
    try {
      await updateProfile({ current_focus: focusInput.trim() || null })
      setEditingFocus(false)
    } finally {
      setSavingFocus(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Live session banner */}
      {activeSessions && activeSessions.length > 0 && activeSessions.map((sess) => (
        <a key={sess.id} href={`/sessions/${sess.id}`}
          className="flex items-center justify-between px-5 py-3 transition-colors"
          style={{ background: "rgba(185,28,28,0.05)", border: "1.5px solid rgba(185,28,28,0.2)" }}
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--red-ink)" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--red-ink)" }} />
            </span>
            <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.8rem", color: "var(--ink)", fontWeight: 500 }}>{sess.group_title} is live</span>
            <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.75rem", color: "var(--ink-muted)" }}>· {sess.member_count} {sess.member_count === 1 ? "person" : "people"} working now</span>
          </div>
          <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.75rem", color: "var(--red-ink)", fontWeight: 500 }}>Join →</span>
        </a>
      ))}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0" style={{ border: "1.5px solid var(--card-border)" }}>
        {/* Streak card */}
        <div style={{ background: "var(--card-bg)", borderRight: "1.5px solid var(--card-border)", padding: "1.5rem" }}>
          <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.75rem" }}>
            Current Streak
          </p>
          <div style={{ fontFamily: "var(--font-playfair), serif", fontSize: "2.5rem", fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1, color: "var(--ink)" }}>
            {streaks?.current ?? 0}
          </div>

          {!editingFocus ? (
            <div className="flex items-center gap-1.5 mt-2 group">
              {currentFocus ? (
                <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.68rem", color: "var(--ink-muted)" }}>
                  days on <span style={{ color: "var(--red-ink)", fontWeight: 500 }}>{currentFocus}</span>
                </p>
              ) : (
                <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.68rem", color: "var(--ink-faint)" }}>days</p>
              )}
              <button onClick={() => { setFocusInput(currentFocus ?? ""); setEditingFocus(true) }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-2">
              <input autoFocus value={focusInput} onChange={(e) => setFocusInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveFocus(); if (e.key === "Escape") setEditingFocus(false) }}
                placeholder="e.g. showup.day" maxLength={40}
                style={{ flex: 1, background: "var(--paper)", border: "1px solid var(--red-ink)", color: "var(--ink)", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.68rem", padding: "0.2rem 0.4rem", outline: "none" }}
              />
              <button onClick={saveFocus} disabled={savingFocus} style={{ color: "var(--green-ink)", background: "none", border: "none", cursor: "pointer", padding: 0 }}><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEditingFocus(false)} style={{ color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer", padding: 0 }}><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {streaks && streaks.current > 0 && (
            <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--rule)" }}>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3" style={{ color: (streaks.freezes_remaining ?? 0) > 0 ? "var(--stamp-blue)" : "var(--ink-faint)" }} />
                <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: (streaks.freezes_remaining ?? 0) > 0 ? "var(--ink-muted)" : "var(--ink-faint)" }}>
                  {(streaks.freezes_remaining ?? 0) > 0 ? "1 freeze available" : "No freezes left"}
                </span>
              </div>
              {(streaks.freezes_remaining ?? 0) > 0 && last7.length > 0 && last7[last7.length - 1]?.score === 0 && (
                <button onClick={() => freezeStreak.mutate()} disabled={freezeStreak.isPending}
                  style={{ marginTop: "0.4rem", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: "var(--red-ink)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  {freezeStreak.isPending ? "Freezing…" : "Use freeze →"}
                </button>
              )}
            </div>
          )}
        </div>

        <StatCard label="Perfect Days" value={perfectDays} suffix="this year" mono />
        <StatCard label="7-day Score" value={`${completionPct}%`} mono />
        <StatCard label="Longest Streak" value={streaks?.longest_ever ?? 0} suffix="days" mono />
      </div>

      {/* Integrity grid */}
      <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", padding: "1.5rem" }}>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <p style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>Integrity Grid</p>
            <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: "var(--ink-faint)", marginTop: "0.2rem", letterSpacing: "0.08em" }}>Last 365 days</p>
          </div>
          <GridTagFilter />
        </div>

        {isLoading ? (
          <div className="h-28 animate-pulse" style={{ background: "var(--paper)" }} />
        ) : (
          <IntegrityGrid days={days} onDayClick={setSelectedDay} activeTag={activeTag} />
        )}

        <div className="flex items-center gap-3 mt-4">
          <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: "var(--ink-faint)" }}>Less</span>
          {[0, 1, 2, 3, 4, 5].map((s) => (
            <div key={s} className={`w-3.5 h-3.5 rounded-sm ${
              s === 0 ? "bg-zinc-200" : s === 1 ? "bg-green-200" : s === 2 ? "bg-green-400" :
              s === 3 ? "bg-green-600" : s === 4 ? "bg-green-700" : "bg-amber-500"
            }`} />
          ))}
          <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: "var(--ink-faint)" }}>More</span>
        </div>
      </div>

      {/* Day detail */}
      {selectedDay && (
        <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", padding: "1.5rem" }}>
          <div className="flex items-center justify-between mb-4">
            <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.8rem", fontWeight: 500, color: "var(--ink)", letterSpacing: "0.05em" }}>{selectedDay.date}</p>
            <button onClick={() => setSelectedDay(null)} style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.68rem", color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer" }}>Close</button>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div style={{ fontFamily: "var(--font-playfair), serif", fontSize: "2.5rem", fontWeight: 900, color: "var(--ink)" }}>{selectedDay.score}</div>
              <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: "var(--ink-faint)", marginTop: "0.2rem" }}>/ 5</div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
              {[
                ["Completion", selectedDay.breakdown.completion],
                ["Group", selectedDay.breakdown.group_contrib],
              ].map(([k, v]) => (
                <>
                  <span key={`k-${k}`} style={{ fontFamily: "var(--font-lora), serif", fontSize: "0.85rem", color: "var(--ink-muted)" }}>{k}</span>
                  <span key={`v-${k}`} style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.85rem", color: "var(--ink)", fontWeight: 500 }}>+{v}</span>
                </>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
