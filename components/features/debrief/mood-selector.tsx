"use client"
// Mood selector — 5 emoji buttons for EOD debrief
// MOOD_EMOJIS from constants.ts

// TODO (Claude Code prompt):
// "Complete components/features/debrief/mood-selector.tsx
//
//  Props: value: number | null, onChange: (v: number) => void
//
//  5 emoji buttons from MOOD_EMOJIS constant (index 0=1, index 4=5)
//  Unselected: grayscale(100%) opacity-40 scale-100
//  Selected: grayscale(0%) opacity-100 scale-125 transition-all
//  Label above: Energy
