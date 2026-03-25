"use client"

import { useState } from "react"
import { useGrid } from "@/hooks/use-grid"
import { useStreaks } from "@/hooks/use-streaks"
import { useGridStore, useGridActions } from "@/store/grid"
import { IntegrityGrid } from "@/components/features/grid/integrity-grid"
import { GridTagFilter } from "@/components/features/grid/grid-tag-filter"
import { StatCard } from "@/components/ui/stat-card"
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
  const [selectedDay, setSelectedDay] = useState<DayScore | null>(null)

  // Weekly stats from last 7 days of the grid
  const last7 = days.slice(-7)
  const completionPct = last7.length
    ? Math.round(last7.reduce((sum, d) => sum + d.score, 0) / (last7.length * 5) * 100)
    : 0
  const perfectDays = days.filter((d) => d.score === 5).length

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current Streak"
          value={streaks?.current ?? 0}
          suffix="days"
          mono
        />
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
