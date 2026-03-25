import { create } from "zustand"

type TimerStatus = "idle" | "running" | "paused" | "break"
type TimerMode = "pomodoro" | "freeform"

const POMODORO_DURATION = 25 * 60   // 25 min in seconds
const BREAK_DURATION = 5 * 60       // 5 min in seconds

interface TimerState {
  commitment_id: string | null
  commitment_title: string | null
  mode: TimerMode
  status: TimerStatus
  elapsed_sec: number
  total_sec: number
  interval_id: ReturnType<typeof setInterval> | null
  actions: {
    start: (commitment_id: string, title: string, mode?: TimerMode) => void
    pause: () => void
    resume: () => void
    stop: () => void
    reset: () => void
    tick: () => void
  }
}

export const useTimerStore = create<TimerState>()((set, get) => ({
  commitment_id: null,
  commitment_title: null,
  mode: "pomodoro",
  status: "idle",
  elapsed_sec: 0,
  total_sec: POMODORO_DURATION,
  interval_id: null,

  actions: {
    start: (commitment_id, title, mode = "pomodoro") => {
      const total_sec = mode === "pomodoro" ? POMODORO_DURATION : 0
      const interval_id = setInterval(() => get().actions.tick(), 1000)
      set({ commitment_id, commitment_title: title, mode, status: "running", elapsed_sec: 0, total_sec, interval_id })
    },
    pause: () => {
      const { interval_id } = get()
      if (interval_id) clearInterval(interval_id)
      set({ status: "paused", interval_id: null })
    },
    resume: () => {
      const interval_id = setInterval(() => get().actions.tick(), 1000)
      set({ status: "running", interval_id })
    },
    stop: () => {
      const { interval_id } = get()
      if (interval_id) clearInterval(interval_id)
      set({ status: "idle", elapsed_sec: 0, interval_id: null, commitment_id: null, commitment_title: null })
    },
    reset: () => {
      const { interval_id } = get()
      if (interval_id) clearInterval(interval_id)
      set({ status: "idle", elapsed_sec: 0, interval_id: null })
    },
    tick: () => {
      const { elapsed_sec, total_sec, mode } = get()
      const next = elapsed_sec + 1
      if (mode === "pomodoro" && next >= total_sec) {
        get().actions.stop()
        return
      }
      set({ elapsed_sec: next })
    },
  },
}))

export const useTimerActions = () => useTimerStore((s) => s.actions)

