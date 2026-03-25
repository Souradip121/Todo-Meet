"use client"

import { INTENSITY_CONFIG, COMMITMENT_TAGS } from "@/lib/constants"
import type { DraftCommitment, Intensity } from "@/lib/types"
import { useDeclarationActions } from "@/store/declaration"
import { X } from "lucide-react"

interface CommitmentSlotProps {
  index: number
  commitment: DraftCommitment
  disabled?: boolean
  canRemove?: boolean
}

export function CommitmentSlot({ index, commitment, disabled, canRemove }: CommitmentSlotProps) {
  const actions = useDeclarationActions()

  return (
    <div className={`bg-[#111118] border border-[#1E1E2E] rounded-xl p-6 space-y-4 ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-slate-600 text-sm font-mono">{index + 1}</span>
        {canRemove && (
          <button
            onClick={() => actions.removeCommitment(commitment.id)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-400 hover:bg-[#16161F] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Title */}
      <input
        type="text"
        value={commitment.title}
        onChange={(e) => actions.updateCommitment(commitment.id, { title: e.target.value })}
        placeholder="What will you ship today?"
        maxLength={200}
        className="w-full bg-[#0A0A0F] border border-[#1E1E2E] text-slate-50 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none rounded-lg h-10 px-3 text-sm"
      />

      {/* Intensity pills */}
      <div className="flex items-center gap-2">
        {(Object.entries(INTENSITY_CONFIG) as [Intensity, { label: string; className: string }][]).map(
          ([key, { label, className }]) => (
            <button
              key={key}
              onClick={() => actions.setIntensity(commitment.id, key)}
              className={`px-2.5 py-0.5 rounded-full text-xs transition-all ${
                commitment.intensity === key
                  ? className
                  : "bg-transparent border border-[#1E1E2E] text-slate-500 hover:border-[#2a2a3e]"
              }`}
            >
              {label}
            </button>
          )
        )}
      </div>

      {/* Tag pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {COMMITMENT_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => actions.updateCommitment(commitment.id, { tag })}
            className={`px-2 py-0.5 rounded-full text-xs capitalize transition-all ${
              commitment.tag === tag
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                : "text-slate-500 border border-[#1E1E2E] hover:border-[#2a2a3e]"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  )
}
