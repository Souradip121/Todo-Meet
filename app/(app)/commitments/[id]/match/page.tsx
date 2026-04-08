"use client"

import { useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, X, Heart, Loader2, Users } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"

interface Candidate {
  id: string
  display_name: string
  avatar_url: string | null
  college_url: string | null
  current_focus: string | null
  commitment_id: string
  commitment_name: string
  commitment_emoji: string
  target_min_day: number | null
  days_logged: number
  logs_last_7_days: number
}

interface MatchResult {
  matched: boolean
  groupId?: string
  groupTitle?: string
}

function CollegeLabel({ url }: { url: string | null }) {
  if (!url) return null
  // Extract domain without protocol and www, used as readable label
  const label = url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").split("/")[0]
  return (
    <span className="text-xs text-slate-400 truncate">{label}</span>
  )
}

function MatchModal({ groupTitle, onContinue }: { groupTitle: string; onContinue: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-semibold text-slate-50 mb-2">It&apos;s a match!</h2>
        <p className="text-sm text-slate-400 mb-6">
          You&apos;ve both expressed interest. Your duo group &ldquo;{groupTitle}&rdquo; has been created.
        </p>
        <Button
          onClick={onContinue}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium h-10 rounded-lg transition-colors"
        >
          View duo
        </Button>
      </div>
    </div>
  )
}

export default function DuoMatchPage() {
  const { id: commitmentId } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [inMatchMode, setInMatchMode] = useState(false)

  const { data, isPending, refetch } = useQuery<{ candidate: Candidate | null; done: boolean }>({
    queryKey: ["duo-match-candidate", commitmentId],
    queryFn: () => apiClient.get(`/duo-match?commitmentId=${commitmentId}`),
    enabled: inMatchMode,
    staleTime: 0,
  })

  const enterMatchMode = useMutation({
    mutationFn: () => apiClient.post("/duo-match", { commitmentId }),
    onSuccess: () => setInMatchMode(true),
  })

  const swipe = useMutation({
    mutationFn: ({ swipedId, direction }: { swipedId: string; direction: "left" | "right" }) =>
      apiClient.post<MatchResult>(`/duo-match/${commitmentId}/swipe`, { swipedId, direction }),
    onSuccess: (result) => {
      if (result.matched) {
        setMatchResult(result)
        qc.invalidateQueries({ queryKey: ["groups"] })
      } else {
        refetch()
      }
    },
  })

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      if (!data?.candidate || swipe.isPending) return
      swipe.mutate({ swipedId: data.candidate.id, direction })
    },
    [data?.candidate, swipe]
  )

  const candidate = data?.candidate
  const done = data?.done

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <button
        onClick={() => router.push(`/commitments/${commitmentId}`)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-50 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to commitment
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-50">Find a duo partner</h1>
        <p className="text-sm text-slate-400 mt-1">
          Match with someone working on the same commitment for mutual accountability.
        </p>
      </div>

      {!inMatchMode ? (
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">🤝</div>
          <h2 className="text-lg font-medium text-slate-50 mb-2">Enter match mode</h2>
          <p className="text-sm text-slate-400 mb-6">
            You&apos;ll be visible to others working on the same commitment. Swipe right to show interest — it&apos;s a match when both sides do.
          </p>
          <Button
            onClick={() => enterMatchMode.mutate()}
            disabled={enterMatchMode.isPending}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium h-10 px-6 rounded-lg transition-colors"
          >
            {enterMatchMode.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Find my partner"
            )}
          </Button>
        </div>
      ) : isPending ? (
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : done || !candidate ? (
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">👀</div>
          <h2 className="text-lg font-medium text-slate-50 mb-2">No more candidates</h2>
          <p className="text-sm text-slate-400">
            You&apos;ve seen everyone in match mode for this commitment. Check back later as more people join.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Candidate card */}
          <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-6">
            <div className="flex items-start gap-4 mb-6">
              {candidate.avatar_url ? (
                <img
                  src={candidate.avatar_url}
                  alt={candidate.display_name}
                  className="w-16 h-16 rounded-full object-cover border border-[#1E1E2E]"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <span className="text-xl font-semibold text-indigo-400">
                    {candidate.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-slate-50">{candidate.display_name}</h3>
                <CollegeLabel url={candidate.college_url} />
                {candidate.current_focus && (
                  <p className="text-xs text-slate-400 mt-1 truncate">{candidate.current_focus}</p>
                )}
              </div>
            </div>

            {/* Commitment */}
            <div className="bg-[#0A0A0F] border border-[#1A1A28] rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{candidate.commitment_emoji}</span>
                <span className="text-sm font-medium text-slate-50">{candidate.commitment_name}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Days logged</p>
                  <p className="text-sm font-mono font-semibold text-slate-50">{candidate.days_logged}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Last 7 days</p>
                  <p className="text-sm font-mono font-semibold text-slate-50">{candidate.logs_last_7_days}/7</p>
                </div>
                {candidate.target_min_day && (
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Daily target</p>
                    <p className="text-sm font-mono font-semibold text-slate-50">
                      {candidate.target_min_day >= 60
                        ? `${Math.floor(candidate.target_min_day / 60)}h`
                        : `${candidate.target_min_day}m`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Swipe buttons */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => handleSwipe("left")}
              disabled={swipe.isPending}
              className="w-16 h-16 rounded-full bg-[#111118] border border-[#1E1E2E] hover:border-red-500/40 hover:bg-red-500/5 flex items-center justify-center transition-colors disabled:opacity-50"
              aria-label="Skip"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
            <button
              onClick={() => handleSwipe("right")}
              disabled={swipe.isPending}
              className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 flex items-center justify-center transition-colors disabled:opacity-50"
              aria-label="Interested"
            >
              {swipe.isPending ? (
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              ) : (
                <Heart className="w-6 h-6 text-indigo-400" />
              )}
            </button>
          </div>
          <p className="text-center text-xs text-slate-600">Skip &nbsp;·&nbsp; Interested</p>
        </div>
      )}

      {matchResult?.matched && matchResult.groupTitle && (
        <MatchModal
          groupTitle={matchResult.groupTitle}
          onContinue={() => router.push("/groups")}
        />
      )}
    </div>
  )
}
