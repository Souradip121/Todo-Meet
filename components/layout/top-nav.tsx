"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Flame, LayoutDashboard, CheckSquare, Timer, BookOpen, LogOut } from "lucide-react"
import { useStreaks } from "@/hooks/use-streaks"
import { useSession, signOut } from "@/lib/auth-client"

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/commitments", label: "Today", icon: CheckSquare },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/debrief", label: "Debrief", icon: BookOpen },
]

export function TopNav() {
  const { data: streaks } = useStreaks()
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.replace("/login")
  }

  const initials = session?.user?.name
    ? session.user.name.charAt(0).toUpperCase()
    : "?"

  return (
    <nav className="h-14 border-b border-[#1E1E2E] bg-[#0A0A0F] flex items-center justify-between px-6 sticky top-0 z-50">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-1.5 shrink-0">
        <span className="text-base font-semibold text-indigo-400">showup</span>
        <span className="text-base font-semibold text-slate-50">.day</span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-indigo-500/10 text-indigo-400"
                  : "text-slate-400 hover:text-slate-50 hover:bg-[#16161F]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          )
        })}
      </div>

      {/* Right side: streak + avatar */}
      <div className="flex items-center gap-3">
        {streaks && streaks.current > 0 && (
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-mono font-medium text-slate-50">
              {streaks.current}
            </span>
          </div>
        )}

        <div className="relative group">
          <button className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center hover:bg-indigo-500/30 transition-colors">
            <span className="text-xs font-medium text-indigo-400">{initials}</span>
          </button>
          {/* Dropdown */}
          <div className="absolute right-0 top-10 w-40 bg-[#111118] border border-[#1E1E2E] rounded-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:text-slate-50 hover:bg-[#16161F] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
