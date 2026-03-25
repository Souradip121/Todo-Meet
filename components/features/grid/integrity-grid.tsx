"use client"
// The integrity grid — 52 columns x 7 rows
// GitHub-style contribution graph
// This is the hero component of showup.day

// TODO (Claude Code prompt to complete this file):
// "Complete components/features/grid/integrity-grid.tsx
//
//  Props: days: DayScore[], onDayClick: (day: DayScore) => void, activeTag: string
//
//  - 52 cols x 7 rows CSS grid, gap-[3px]
//  - Cell: 14x14px rounded-sm, colour from SCORE_CLASSES in constants.ts
//  - Today cell: ring-1 ring-indigo-500/50
//  - Hover: shadcn Tooltip showing date + score + breakdown
//    Breakdown shows: Declaration +1 / Completion +2 / Debrief +1 / Group +1
//  - Month labels above grid: abbreviated month name at start of each month col
//  - Score 5 cells get a subtle scale-105 on hover to feel special
//  - Import DayScore from @/lib/types
//  - Import SCORE_CLASSES from @/lib/constants"

