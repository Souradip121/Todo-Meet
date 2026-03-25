"use client"
// Day replay sheet — slides in from right when a grid cell is clicked
// Shows full day: declaration, completions, debrief, focus time

// TODO (Claude Code prompt):
// "Complete components/features/grid/day-replay-sheet.tsx
//
//  Props: date: string | null, onClose: () => void
//
//  Uses shadcn Sheet (side=right, width 400px)
//  Fetches data via useDayReplay(date) hook
//  Shows:
//    - Date heading + integrity score as large number
//    - Score breakdown: 4 rows with labels and points
//    - Morning declarations section: list of commitments with status icons
//    - Focus time logged in hours/minutes
//    - EOD debrief section: what_moved + what_didnt as styled blockquotes
//    - Mood + energy as emoji if present
//  Loading state: SkeletonCard x3
//  Empty state if no data for that day"

