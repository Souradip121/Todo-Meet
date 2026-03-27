"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signUp } from "@/lib/auth-client"

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

export default function RegisterPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (displayName.length > 50) { setError("Display name must be 50 characters or less"); return }
    setLoading(true)
    try {
      await signUp.email({ email, password, name: displayName, username })
      router.push("/onboarding")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { label: "Display Name", type: "text", value: displayName, set: setDisplayName, placeholder: "Alex Chen", maxLength: 50 },
    { label: "Username", type: "text", value: username, set: (v: string) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, "")), placeholder: "alexchen" },
    { label: "Email", type: "email", value: email, set: setEmail, placeholder: "you@example.com" },
    { label: "Password", type: "password", value: password, set: setPassword, placeholder: "Min. 8 characters", minLength: 8 },
  ]

  return (
    <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--card-border)", padding: "2.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "1.75rem", fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: "0.3rem" }}>
          show<span style={{ color: "var(--red-ink)" }}>up</span>.day
        </h1>
        <p style={{ fontFamily: "var(--font-lora), serif", fontSize: "0.9rem", color: "var(--ink-muted)" }}>
          Create your account — takes 60 seconds
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {fields.map((f) => (
          <div key={f.label}>
            <label style={labelStyle}>{f.label}</label>
            <input
              type={f.type} value={f.value}
              onChange={(e) => f.set(e.target.value)}
              required placeholder={f.placeholder}
              maxLength={(f as { maxLength?: number }).maxLength}
              minLength={(f as { minLength?: number }).minLength}
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--red-ink)" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--card-border)" }}
            />
          </div>
        ))}

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
          {loading ? "Creating account…" : "Create account →"}
        </button>
      </form>

      <div style={{ height: "1px", background: "var(--rule)", margin: "1.5rem 0" }} />
      <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.72rem", color: "var(--ink-faint)", textAlign: "center" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "var(--red-ink)", textDecoration: "none" }}>Sign in</Link>
      </p>
    </div>
  )
}
