// Intensity badge — used on commitment cards
// Usage: <IntensityBadge intensity="firm" />

import { INTENSITY_CONFIG } from "@/lib/constants"
import type { Intensity } from "@/lib/types"

interface IntensityBadgeProps {
  intensity: Intensity
}

export function IntensityBadge({ intensity }: IntensityBadgeProps) {
  const config = INTENSITY_CONFIG[intensity]
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${config.className}`}>
      {config.label}
    </span>
  )
}

