"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ibm-mono), monospace",
  fontSize: "0.65rem",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--ink-faint)",
  display: "block",
  marginBottom: "0.4rem",
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  async function handleLinkedIn() {
    setLoading(true)
    await authClient.signIn.social({
      provider: "linkedin",
      callbackURL: "/dashboard",
    })
  }

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1.5px solid var(--card-border)",
        padding: "2.5rem",
      }}
    >
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-playfair), serif",
            fontSize: "1.75rem",
            fontWeight: 900,
            color: "var(--ink)",
            letterSpacing: "-0.02em",
            marginBottom: "0.3rem",
          }}
        >
          show<span style={{ color: "var(--red-ink)" }}>up</span>.day
        </h1>
        <p
          style={{
            fontFamily: "var(--font-lora), serif",
            fontSize: "0.9rem",
            color: "var(--ink-muted)",
          }}
        >
          Sign in with your LinkedIn account
        </p>
      </div>

      <p style={labelStyle}>Continue with</p>

      <button
        type="button"
        onClick={handleLinkedIn}
        disabled={loading}
        style={{
          width: "100%",
          background: loading ? "#888" : "#0A66C2",
          color: "#fff",
          border: "none",
          height: "2.6rem",
          fontFamily: "var(--font-ibm-mono), monospace",
          fontSize: "0.82rem",
          letterSpacing: "0.05em",
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.6rem",
          borderRadius: "2px",
        }}
      >
        {/* LinkedIn logo */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        {loading ? "Redirecting…" : "Continue with LinkedIn"}
      </button>

      <div style={{ height: "1px", background: "var(--rule)", margin: "1.5rem 0" }} />

      <p
        style={{
          fontFamily: "var(--font-ibm-mono), monospace",
          fontSize: "0.68rem",
          color: "var(--ink-faint)",
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        Your name and photo come from LinkedIn automatically.
        <br />
        LinkedIn ensures one account per real person.
      </p>
    </div>
  )
}
