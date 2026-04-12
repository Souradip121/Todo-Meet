"use client"

import { useGridStore, useGridActions } from "@/store/grid"
import type { RecurringCommitment } from "@/lib/types"

interface GridCommitmentFilterProps {
  commitments: RecurringCommitment[]
}

export function GridTagFilter({ commitments }: GridCommitmentFilterProps) {
  const activeId = useGridStore((s) => s.active_commitment_id)
  const actions = useGridActions()

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {commitments.map((c) => {
        const active = activeId === c.id
        return (
          <button
            key={c.id}
            onClick={() => actions.setCommitment(active ? "all" : c.id)}
            className={`px-3 h-7 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
              active
                ? "bg-[#111118] border border-[#1E1E2E] text-slate-50"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span>{c.emoji}</span>
            <span>{c.name}</span>
          </button>
        )
      })}
    </div>
  )
}
