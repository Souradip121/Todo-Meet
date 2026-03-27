import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { DraftCommitment, Intensity } from "@/lib/types"

interface DeclarationState {
  commitments: DraftCommitment[]
  actions: {
    addCommitment: () => void
    updateCommitment: (id: string, updates: Partial<DraftCommitment>) => void
    removeCommitment: (id: string) => void
    setIntensity: (id: string, intensity: Intensity) => void
    reset: () => void
  }
}

const makeId = () => Math.random().toString(36).slice(2)

const emptyCommitment = (): DraftCommitment => ({
  id: makeId(),
  title: "",
  intensity: "firm",
  tag: "work",
  type: "personal",
})

const initialState = {
  commitments: [emptyCommitment()],
}

export const useDeclarationStore = create<DeclarationState>()(
  persist(
    (set) => ({
      ...initialState,
      actions: {
        addCommitment: () =>
          set((s) => {
            if (s.commitments.length >= 3) return s
            return { commitments: [...s.commitments, emptyCommitment()] }
          }),
        updateCommitment: (id, updates) =>
          set((s) => ({
            commitments: s.commitments.map((c) =>
              c.id === id ? { ...c, ...updates } : c
            ),
          })),
        removeCommitment: (id) =>
          set((s) => ({
            commitments: s.commitments.filter((c) => c.id !== id),
          })),
        setIntensity: (id, intensity) =>
          set((s) => ({
            commitments: s.commitments.map((c) =>
              c.id === id ? { ...c, intensity } : c
            ),
          })),
        reset: () => set({ commitments: [emptyCommitment()] }),
      },
    }),
    {
      name: "showup-declaration-draft",
      partialize: (state) => ({ commitments: state.commitments }),
    }
  )
)

export const useDeclarationActions = () =>
  useDeclarationStore((s) => s.actions)

