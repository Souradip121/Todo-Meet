"use client"
// SVG progress ring for the focus timer
// Animates as elapsed time increases

// TODO (Claude Code prompt):
// "Complete components/features/timer/focus-ring.tsx
//
//  Props: elapsed_sec: number, total_sec: number, size?: number
//  Default size: 200px
//
//  SVG circle with:
//    - Background ring: stroke #1E1E2E, strokeWidth 3
//    - Progress ring: stroke #6366F1, strokeWidth 3
//    - stroke-dasharray = circumference
//    - stroke-dashoffset animates from 0 to circumference as progress 0→1
//    - CSS transition: transition-all duration-1000 ease-linear
//  Children rendered in center (timer digits)"

