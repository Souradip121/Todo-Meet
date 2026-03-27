import { CommitmentHeatmap } from "@/components/features/commitments/commitment-heatmap"
import Link from "next/link"
import type { CommitmentLog } from "@/lib/types"

interface ShareData {
  name: string
  emoji: string
  color: "green" | "indigo" | "amber"
  period_days: number
  start_date: string
  end_date: string
  logs: CommitmentLog[]
  streak: number
  total_hours: number
  days_logged: number
}

async function getShareData(token: string): Promise<ShareData | null> {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) return null
  try {
    const res = await fetch(`${base}/share/${token}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function SharePage({ params }: { params: { token: string } }) {
  const data = await getShareData(params.token)

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 text-sm">This link is invalid or expired.</p>
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 text-sm mt-3 block">
            Start your own commitment →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="flex items-center gap-1 mb-8">
          <span className="text-base font-semibold text-indigo-400">showup</span>
          <span className="text-base font-semibold text-slate-50">.day</span>
        </div>

        <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-6">
          {/* Commitment header */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl">{data.emoji}</span>
            <div>
              <h1 className="text-xl font-semibold text-slate-50">{data.name}</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {data.period_days}-day commitment
              </p>
            </div>
          </div>

          {/* Heatmap */}
          <CommitmentHeatmap logs={data.logs} color={data.color} />

          {/* Score legend */}
          <div className="flex items-center gap-3 mt-4 mb-6">
            <span className="text-xs text-slate-600">Less</span>
            {[0, 1, 2, 3, 4, 5].map((s) => (
              <div key={s} className={`w-3.5 h-3.5 rounded-sm ${
                s === 0 ? "bg-zinc-900" : s === 1 ? "bg-green-950" : s === 2 ? "bg-green-800" :
                s === 3 ? "bg-green-600" : s === 4 ? "bg-green-500" : "bg-amber-400"
              }`} />
            ))}
            <span className="text-xs text-slate-600">More</span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 pt-4 border-t border-[#1E1E2E]">
            {data.streak > 0 && (
              <div>
                <p className="text-xs text-slate-500">Streak</p>
                <p className="text-2xl font-mono font-semibold text-amber-400">🔥 {data.streak}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-2xl font-mono font-semibold text-slate-50">{data.total_hours}h</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Days logged</p>
              <p className="text-2xl font-mono font-semibold text-slate-50">{data.days_logged}</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500 mb-3">Track your own commitments</p>
          <Link
            href="/register"
            className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-medium h-10 px-6 rounded-lg transition-colors text-sm"
          >
            Start your own →
          </Link>
        </div>
      </div>
    </div>
  )
}
