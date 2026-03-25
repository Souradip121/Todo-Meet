"use client"

import { MOOD_EMOJIS } from "@/lib/constants"

interface MoodSelectorProps {
  label: string
  value: number | null
  onChange: (v: number) => void
}

export function MoodSelector({ label, value, onChange }: MoodSelectorProps) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">{label}</p>
      <div className="flex items-center gap-3">
        {MOOD_EMOJIS.map((emoji, i) => {
          const score = i + 1
          const selected = value === score
          return (
            <button
              key={score}
              onClick={() => onChange(score)}
              className="text-2xl transition-all duration-150"
              style={{
                filter: selected ? "grayscale(0%)" : "grayscale(100%)",
                opacity: selected ? 1 : 0.4,
                transform: selected ? "scale(1.25)" : "scale(1)",
              }}
              title={`${score}/5`}
            >
              {emoji}
            </button>
          )
        })}
      </div>
    </div>
  )
}
