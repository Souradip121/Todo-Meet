// App-wide constants

export const SCORE_CLASSES: Record<number, string> = {
  0: "bg-[#EEEBE3] border border-[#D4D0C4]",
  1: "bg-[#dcfce7] border border-[#86efac]",
  2: "bg-[#86efac] border border-[#22c55e]",
  3: "bg-green-500 border border-green-600",
  4: "bg-[#15803d] border border-[#14532d]",
  5: "bg-amber-400 border border-amber-500",
}

export const INTENSITY_CONFIG = {
  soft: {
    label: "Soft",
    className: "bg-zinc-800 text-slate-400 border border-zinc-700",
  },
  firm: {
    label: "Firm",
    className: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
  },
  non_negotiable: {
    label: "Non-Negotiable",
    className: "bg-indigo-500 text-white border border-indigo-500",
  },
} as const

export const PERSONA_LABELS: Record<number, string> = {
  0: "Beginner",
  1: "Builder",
  2: "Consistent",
  3: "Committed",
  4: "Rare",
}

export const MOOD_EMOJIS = ["😴", "😔", "😐", "😊", "⚡"]

export const COMMITMENT_TAGS = [
  "work",
  "learning",
  "health",
  "relationships",
  "other",
] as const

export type CommitmentTag = (typeof COMMITMENT_TAGS)[number]
export type Intensity = keyof typeof INTENSITY_CONFIG

