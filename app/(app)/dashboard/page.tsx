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

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

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

  async function saveFocus() {
    setSavingFocus(true)
    try {
      await updateProfile({ current_focus: focusInput.trim() || null })
      setEditingFocus(false)
    } finally {
      setSavingFocus(false)
    }
  }

  // Weekly stats from last 7 days of the grid
  const last7 = days.slice(-7)
  const completionPct = last7.length
    ? Math.round(last7.reduce((sum, d) => sum + d.score, 0) / (last7.length * 5) * 100)
    : 0
  const perfectDays = days.filter((d) => d.score === 5).length

  return (
    <div className="space-y-8">
      {/* Live session banner */}
      {activeSessions && activeSessions.length > 0 && activeSessions.map((sess) => (
        <a
          key={sess.id}
          href={`/sessions/${sess.id}`}
          className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-5 py-3 hover:bg-indigo-500/15 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
            </span>
            <span className="text-sm text-slate-50 font-medium">{sess.group_title} is live</span>
            <span className="text-sm text-slate-400">·  {sess.member_count} {sess.member_count === 1 ? "person" : "people"} working now</span>
          </div>
          <span className="text-sm text-indigo-400 font-medium">Join →</span>
        </a>
      ))}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak card — with project name inline edit */}
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-6">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Current Streak</p>
          <div className="text-5xl font-semibold font-mono text-slate-50">
            {streaks?.current ?? 0}
          </div>
          {!editingFocus ? (
            <div className="flex items-center gap-1.5 mt-2 group">
              {currentFocus ? (
                <p className="text-xs text-slate-400">
                  days on <span className="text-indigo-400 font-medium">{currentFocus}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-600">days</p>
              )}
              <button
                onClick={() => { setFocusInput(currentFocus ?? ""); setEditingFocus(true) }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-slate-400"
                title="Set current focus"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-2">
              <input
                autoFocus
                value={focusInput}
                onChange={(e) => setFocusInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveFocus(); if (e.key === "Escape") setEditingFocus(false) }}
                placeholder="e.g. showup.day"
                maxLength={40}
                className="flex-1 bg-[#0A0A0F] border border-indigo-500/50 text-slate-50 placeholder:text-slate-600 rounded px-1.5 py-0.5 text-xs focus:outline-none"
              />
              <button onClick={saveFocus} disabled={savingFocus} className="text-green-500 hover:text-green-400">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditingFocus(false)} className="text-slate-600 hover:text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Freeze indicator */}
          {streaks && streaks.current > 0 && (
            <div className="mt-3 pt-3 border-t border-[#1E1E2E]">
              {(streaks.freezes_remaining ?? 0) > 0 ? (
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-indigo-400" />
                  <span className="text-xs text-slate-500">1 freeze available</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-slate-700" />
                  <span className="text-xs text-slate-700">No freezes left</span>
                </div>
              )}
              {/* Use freeze — shown when today's score is 0 and freeze available */}
              {(streaks.freezes_remaining ?? 0) > 0 && last7.length > 0 && last7[last7.length - 1]?.score === 0 && (
                <button
                  onClick={() => freezeStreak.mutate()}
                  disabled={freezeStreak.isPending}
                  className="mt-1.5 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
                >
                  {freezeStreak.isPending ? "Freezing…" : "Use freeze →"}
                </button>
              )}
            </div>
          )}
        </div>
        <StatCard
          label="Perfect Days"
          value={perfectDays}
          suffix="this year"
          mono
        />
        <StatCard
          label="7-day Score"
          value={`${completionPct}%`}
          mono
        />
        <StatCard
          label="Longest Streak"
          value={streaks?.longest_ever ?? 0}
          suffix="days"
          mono
        />
      </div>

      {/* Integrity grid */}
      <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <p className="text-sm font-medium text-slate-50">Integrity Grid</p>
            <p className="text-xs text-slate-500 mt-0.5">Last 365 days</p>
          </div>
          <GridTagFilter />
        </div>

        {isLoading ? (
          <div className="h-28 bg-[#0A0A0F] rounded-lg animate-pulse" />
        ) : (
          <IntegrityGrid
            days={days}
            onDayClick={setSelectedDay}
            activeTag={activeTag}
          />
        )}

        {/* Score legend */}
        <div className="flex items-center gap-3 mt-4">
          <span className="text-xs text-slate-600">Less</span>
          {[0, 1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`w-3.5 h-3.5 rounded-sm ${
                s === 0 ? "bg-zinc-900" :
                s === 1 ? "bg-green-950" :
                s === 2 ? "bg-green-800" :
                s === 3 ? "bg-green-600" :
                s === 4 ? "bg-green-500" :
                "bg-amber-400"
              }`}
            />
          ))}
          <span className="text-xs text-slate-600">More</span>
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-50">{selectedDay.date}</p>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Close
            </button>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-semibold font-mono text-slate-50">{selectedDay.score}</div>
              <div className="text-xs text-slate-500 mt-1">/ 5</div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
              <span className="text-slate-400">Declaration</span>
              <span className="font-mono text-slate-50">+{selectedDay.breakdown.declaration}</span>
              <span className="text-slate-400">Completion</span>
              <span className="font-mono text-slate-50">+{selectedDay.breakdown.completion}</span>
              <span className="text-slate-400">Debrief</span>
              <span className="font-mono text-slate-50">+{selectedDay.breakdown.debrief}</span>
              <span className="text-slate-400">Group</span>
              <span className="font-mono text-slate-50">+{selectedDay.breakdown.group_contrib}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
