import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, eachDayOfInterval, subYears, startOfDay } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate 365 days for the grid (today going back 1 year)
export function generateGridDays(): string[] {
  const end = startOfDay(new Date())
  const start = subYears(end, 1)
  return eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"))
}

// Format seconds to MM:SS
export function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0")
  const s = (seconds % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

// Format date for display
export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "MMM d, yyyy")
}

