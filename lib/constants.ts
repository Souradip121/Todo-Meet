// App-wide constants

export const SCORE_CLASSES: Record<number, string> = {
  0: "bg-zinc-900",
  1: "bg-green-950",
  2: "bg-green-800",
  3: "bg-green-600",
  4: "bg-green-500",
  5: "bg-amber-400",
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

