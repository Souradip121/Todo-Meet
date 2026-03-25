"use client"
// Top navigation bar — persistent across all (app) routes
// Logo left | streak center | avatar right

import Link from "next/link"
import { Flame } from "lucide-react"
import { useStreaks } from "@/hooks/use-streaks"

export function TopNav() {
  const { data: streaks } = useStreaks()

  return (
    <nav className="h-14 border-b border-[#1E1E2E] bg-[#0A0A0F] flex items-center justify-between px-6 sticky top-0 z-50">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-1.5">
        <span className="text-base font-semibold text-indigo-400">showup</span>
        <span className="text-base font-semibold text-slate-50">.day</span>
      </Link>

      {/* Streak — center */}
      {streaks && (
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-mono font-medium text-slate-50">
            {streaks.current}
          </span>
          <span className="text-xs text-slate-500">day streak</span>
        </div>
      )}

      {/* Avatar placeholder — wire to auth */}
      <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
        <span className="text-xs font-medium text-indigo-400">S</span>
      </div>
    </nav>
  )
}

