"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Flame, LayoutDashboard, CalendarCheck, ListChecks, Timer, Users, LogOut } from "lucide-react"
import { useStreaks } from "@/hooks/use-streaks"
import { useSession, signOut } from "@/lib/auth-client"

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/commitments/today", label: "Today", icon: CalendarCheck },
  { href: "/commitments", label: "Commitments", icon: ListChecks },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/groups", label: "Groups", icon: Users },
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
    <nav
      className="h-[60px] flex items-center justify-between px-6 sticky top-0 z-50"
      style={{
        background: "rgba(250,250,246,0.92)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        className="shrink-0"
        style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)", textDecoration: "none" }}
      >
        show<span style={{ color: "var(--red-ink)" }}>up</span>.day
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1">
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href || (href !== "/commitments" && pathname.startsWith(href + "/")) || (href === "/commitments" && pathname === "/commitments")
          return (
            <Link
              key={href}
              href={href}
              className="px-3 h-8 flex items-center text-xs transition-colors"
              style={{
                fontFamily: "var(--font-ibm-mono), monospace",
                letterSpacing: "0.06em",
                textTransform: "lowercase",
                color: active ? "var(--red-ink)" : "var(--ink-muted)",
                background: active ? "rgba(185,28,28,0.06)" : "transparent",
                borderBottom: active ? "1.5px solid var(--red-ink)" : "1.5px solid transparent",
                textDecoration: "none",
              }}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Right: streak + avatar */}
      <div className="flex items-center gap-4">
        {streaks && streaks.current > 0 && (
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" style={{ color: "var(--amber-ink)" }} />
            <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.85rem", fontWeight: 500, color: "var(--ink)" }}>
              {streaks.current}
            </span>
          </div>
        )}

        <div className="relative group">
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: "var(--ink)",
              color: "var(--paper)",
              fontFamily: "var(--font-ibm-mono), monospace",
              fontSize: "0.7rem",
              fontWeight: 500,
            }}
          >
            {initials}
          </button>
          <div
            className="absolute right-0 top-10 w-40 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all"
            style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)" }}
          >
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs transition-colors text-left"
              style={{ fontFamily: "var(--font-ibm-mono), monospace", color: "var(--ink-muted)", letterSpacing: "0.05em" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--paper-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--ink)" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "var(--ink-muted)" }}
            >
              <LogOut className="w-3.5 h-3.5" />
              sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
