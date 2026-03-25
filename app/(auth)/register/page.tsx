"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signUp } from "@/lib/auth-client"

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
    if (displayName.length > 50) {
      setError("Display name must be 50 characters or less")
      return
    }
    setLoading(true)
    try {
      await signUp.email({ email, password, name: displayName, username })
      router.push("/declare")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-50">showup.day</h1>
        <p className="text-sm text-slate-400 mt-1">Create your account — takes 60 seconds</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={50}
            className="w-full bg-[#0A0A0F] border border-[#1E1E2E] text-slate-50 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none rounded-lg h-10 px-3 text-sm"
            placeholder="Alex Chen"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-2">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            required
            className="w-full bg-[#0A0A0F] border border-[#1E1E2E] text-slate-50 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none rounded-lg h-10 px-3 text-sm"
            placeholder="alexchen"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-[#0A0A0F] border border-[#1E1E2E] text-slate-50 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none rounded-lg h-10 px-3 text-sm"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full bg-[#0A0A0F] border border-[#1E1E2E] text-slate-50 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none rounded-lg h-10 px-3 text-sm"
            placeholder="Min. 8 characters"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium h-10 rounded-lg transition-colors text-sm"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div className="h-px bg-[#1E1E2E] my-6" />

      <p className="text-sm text-slate-400 text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
