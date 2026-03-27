"use client"

import { useSession } from "@/lib/auth-client"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { apiClient } from "@/lib/api-client"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login")
      return
    }
    // First-time user: no commitments → onboarding
    if (!isPending && session && pathname !== "/onboarding") {
      apiClient.get<unknown[]>("/commitments/recurring").then((list) => {
        if (Array.isArray(list) && list.length === 0) {
          router.replace("/onboarding")
        }
      }).catch(() => {})
    }
  }, [session, isPending, router, pathname])

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0F" }}>
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return null

  return <AppShell>{children}</AppShell>
}
