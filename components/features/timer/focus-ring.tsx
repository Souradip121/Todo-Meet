"use client"

interface FocusRingProps {
  elapsed_sec: number
  total_sec: number
  size?: number
  children?: React.ReactNode
}

export function FocusRing({ elapsed_sec, total_sec, size = 200, children }: FocusRingProps) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const progress = total_sec > 0 ? elapsed_sec / total_sec : 0
  const offset = circumference * (1 - Math.min(progress, 1))

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1E1E2E"
          strokeWidth={3}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#6366F1"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="relative z-10 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
