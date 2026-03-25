// Loading skeleton — use for all loading states, never use spinners

interface SkeletonCardProps {
  lines?: number
  className?: string
}

function SkeletonLine({ width = "full" }: { width?: string }) {
  return (
    <div
      className={`h-3 bg-[#1E1E2E] rounded animate-pulse w-${width}`}
    />
  )
}

export function SkeletonCard({ lines = 3, className = "" }: SkeletonCardProps) {
  return (
    <div className={`bg-[#111118] border border-[#1E1E2E] rounded-xl p-6 space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          width={i === 0 ? "full" : i === lines - 1 ? "1/2" : "3/4"}
        />
      ))}
    </div>
  )
}

export function SkeletonGrid() {
  return (
    <div className="grid grid-rows-7 grid-flow-col gap-[3px]">
      {Array.from({ length: 365 }).map((_, i) => (
        <div
          key={i}
          className="w-3 h-3 rounded-sm bg-[#1E1E2E] animate-pulse"
        />
      ))}
    </div>
  )
}

