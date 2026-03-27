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

      <div style={{ height: "1px", background: "var(--rule)", margin: "1.5rem 0" }} />
      <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem", color: "var(--ink-faint)", textAlign: "center" }}>
        No account?{" "}
        <Link href="/register" style={{ color: "var(--red-ink)", textDecoration: "none" }}>Register</Link>
      </p>
    </div>
  )
}
