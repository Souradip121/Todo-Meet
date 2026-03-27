"use client"

import { IntegrityGrid } from "@/components/features/grid/integrity-grid"
import { minutesToScore } from "@/lib/types"
import type { CommitmentLog, DayScore } from "@/lib/types"

interface CommitmentHeatmapProps {
  logs: CommitmentLog[]
  color?: "green" | "indigo" | "amber"
}

export function CommitmentHeatmap({ logs }: CommitmentHeatmapProps) {
  // Convert logs to DayScore[] so we can reuse IntegrityGrid
  const days: DayScore[] = logs.map((log) => ({
    date: log.date,
    score: minutesToScore(log.duration_minutes),
    breakdown: { declaration: 0, completion: minutesToScore(log.duration_minutes), debrief: 0, group_contrib: 0 },
  }))

  return (
    <IntegrityGrid
      days={days}
      onDayClick={() => {}}
    />
  )
}
