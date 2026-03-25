import { create } from "zustand"
import type { CommitmentTag } from "@/lib/types"

interface GridState {
  active_tag: CommitmentTag | "all"
  selected_day: string | null
  actions: {
    setTag: (tag: CommitmentTag | "all") => void
    selectDay: (date: string | null) => void
  }
}

export const useGridStore = create<GridState>()((set) => ({
  active_tag: "all",
  selected_day: null,
  actions: {
    setTag: (active_tag) => set({ active_tag }),
    selectDay: (selected_day) => set({ selected_day }),
  },
}))

export const useGridActions = () => useGridStore((s) => s.actions)

