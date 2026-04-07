"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { saveTokens } from "@/lib/auth-client"

function AuthCallback() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const token = params.get("token")
    const refresh = params.get("refresh")

    if (token && refresh) {
      saveTokens(token, refresh)
      router.replace("/dashboard")
    } else {
      router.replace("/login?error=oauth_failed")
    }
  }, [params, router])

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--paper)", fontFamily: "var(--font-ibm-mono), monospace",
      fontSize: "0.8rem", color: "var(--ink-faint)", letterSpacing: "0.1em",
    }}>
      Signing you in…
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallback />
    </Suspense>
  )
}
