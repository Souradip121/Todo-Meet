"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "@/lib/auth-client"

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--paper)", border: "1.5px solid var(--card-border)",
  color: "var(--ink)", fontFamily: "var(--font-lora), serif", fontSize: "0.9rem",
  height: "2.6rem", padding: "0 0.75rem", outline: "none",
}
const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem",
  letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-faint)",
  display: "block", marginBottom: "0.4rem",
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn.email({ email, password })
      router.push("/dashboard")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", padding: "2.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.75rem", fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: "0.3rem" }}>
          show<span style={{ color: "var(--red-ink)" }}>up</span>.day
        </h1>
        <p style={{ fontFamily: "var(--font-lora), serif", fontSize: "0.9rem", color: "var(--ink-muted)" }}>
          Sign in to your account
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={labelStyle}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            placeholder="you@example.com" style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--red-ink)" }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--card-border)" }}
          />
        </div>
        <div>
          <label style={labelStyle}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            placeholder="••••••••" style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--red-ink)" }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--card-border)" }}
          />
        </div>

        {error && (
          <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.75rem", color: "var(--red-ink)", background: "rgba(185,28,28,0.06)", border: "1px solid rgba(185,28,28,0.2)", padding: "0.5rem 0.75rem" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} style={{
          background: loading ? "var(--ink-muted)" : "var(--ink)", color: "var(--paper)",
          border: "none", height: "2.6rem", fontFamily: "var(--font-ibm-mono), monospace",
          fontSize: "0.82rem", letterSpacing: "0.05em", cursor: loading ? "not-allowed" : "pointer", marginTop: "0.25rem",
        }}>
          {loading ? "Signing in…" : "Sign in →"}
        </button>
      </form>

      <div style={{ height: "1px", background: "var(--rule)", margin: "1.5rem 0", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", letterSpacing: "0.12em", color: "var(--ink-faint)", background: "var(--card-bg)", padding: "0 0.5rem", whiteSpace: "nowrap" }}>or</span>
      </div>

      {/* Google sign-in */}
      <button
        type="button"
        onClick={() => { window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/google` }}
        style={{
          width: "100%", background: "var(--paper)", color: "var(--ink)",
          border: "1.5px solid var(--card-border)", height: "2.6rem",
          fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.82rem",
          letterSpacing: "0.05em", cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center", gap: "0.6rem",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--ink)" }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--card-border)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div style={{ height: "1px", background: "var(--rule)", margin: "1.5rem 0" }} />
      <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem", color: "var(--ink-faint)", textAlign: "center" }}>
        No account?{" "}
        <Link href="/register" style={{ color: "var(--red-ink)", textDecoration: "none" }}>Register</Link>
      </p>
    </div>
  )
}
