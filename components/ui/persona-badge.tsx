// Persona badge — visible on profile and booking page
// Usage: <PersonaBadge level={2} />

import { PERSONA_LABELS } from "@/lib/constants"

interface PersonaBadgeProps {
  level: number
  showDays?: number
}

export function PersonaBadge({ level, showDays }: PersonaBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
        {PERSONA_LABELS[level] ?? "Unknown"}
      </span>
      {showDays && (
        <span className="text-xs text-slate-500">{showDays} days</span>
      )}
    </div>
  )
}

