"use client"
// Timer control buttons — pause, stop, skip
// Used in the full-screen focus page

// TODO (Claude Code prompt):
// "Complete components/features/timer/timer-controls.tsx
//
//  Uses useTimerStore for status, useTimerActions for actions
//  Three icon buttons in a row, gap-8:
//    - Pause/Resume: PauseCircle / PlayCircle icon, w-9 h-9
//    - Stop: StopCircle icon, w-9 h-9 — confirm before stopping
//    - Skip break: SkipForward icon, w-9 h-9 — only visible in break status
//  All buttons: text-slate-400 hover:text-slate-50 transition-colors
//  No button backgrounds — icon-only"

