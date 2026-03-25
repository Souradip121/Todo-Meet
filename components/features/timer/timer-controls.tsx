"use client"

import { PauseCircle, PlayCircle, StopCircle, SkipForward } from "lucide-react"
import { useTimerStore, useTimerActions } from "@/store/timer"

export function TimerControls() {
  const status = useTimerStore((s) => s.status)
  const actions = useTimerActions()

  function handleStop() {
    if (window.confirm("Stop the timer? Focus time will be logged.")) {
      actions.stop()
    }
  }

  return (
    <div className="flex items-center gap-8">
      {/* Pause / Resume */}
      {status === "running" ? (
        <button
          onClick={actions.pause}
          className="text-slate-400 hover:text-slate-50 transition-colors"
          title="Pause"
        >
          <PauseCircle className="w-9 h-9" />
        </button>
      ) : status === "paused" ? (
        <button
          onClick={actions.resume}
          className="text-slate-400 hover:text-slate-50 transition-colors"
          title="Resume"
        >
          <PlayCircle className="w-9 h-9" />
        </button>
      ) : null}

      {/* Stop */}
      {(status === "running" || status === "paused") && (
        <button
          onClick={handleStop}
          className="text-slate-400 hover:text-red-400 transition-colors"
          title="Stop"
        >
          <StopCircle className="w-9 h-9" />
        </button>
      )}

      {/* Skip break */}
      {status === "break" && (
        <button
          onClick={actions.reset}
          className="text-slate-400 hover:text-slate-50 transition-colors"
          title="Skip break"
        >
          <SkipForward className="w-9 h-9" />
        </button>
      )}
    </div>
  )
}
