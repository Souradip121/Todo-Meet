"use client"

import { useGridStore, useGridActions } from "@/store/grid"
import { COMMITMENT_TAGS } from "@/lib/constants"

const ALL_TAGS = ["all", ...COMMITMENT_TAGS] as const

export function GridTagFilter() {
  const activeTag = useGridStore((s) => s.active_tag)
  const actions = useGridActions()

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {ALL_TAGS.map((tag) => {
        const active = activeTag === tag
        return (
          <button
            key={tag}
            onClick={() => actions.setTag(tag as typeof activeTag)}
            className={`px-3 h-7 rounded-lg text-xs capitalize transition-colors ${
              active
                ? "bg-[#111118] border border-[#1E1E2E] text-slate-50"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tag}
          </button>
        )
      })}
    </div>
  )
}
