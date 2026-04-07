import { create } from "zustand"

interface GridState {
  active_commitment_id: string | "all"
  selected_day: string | null
  actions: {
    setCommitment: (id: string | "all") => void
    selectDay: (date: string | null) => void
  }
}

export const useGridStore = create<GridState>()((set) => ({
  active_commitment_id: "all",
  selected_day: null,
  actions: {
    setCommitment: (active_commitment_id) => set({ active_commitment_id }),
    selectDay: (selected_day) => set({ selected_day }),
  },
}))

export const useGridActions = () => useGridStore((s) => s.actions)
