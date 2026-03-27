"use client"

import { useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Play, Square } from "lucide-react"
import { useSessionStore, useSessionActions } from "@/store/session"
import { PresenceRow } from "@/components/features/sessions/presence-row"
import { SessionEndCards } from "@/components/features/sessions/session-end-cards"
import { useSession as useAuthSession } from "@/lib/auth-client"
import { apiClient } from "@/lib/api-client"

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: auth } = useAuthSession()
  const { room_id, members, timer, phase, is_host } = useSessionStore()
  const actions = useSessionActions()
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentUserId = auth?.user?.id ?? ""

  useEffect(() => {
    // Join via REST then connect WebSocket
    async function joinAndConnect() {
      try {
        await apiClient.post(`/sessions/${id}/join`, {})
        // Use access token directly as WS auth (server validates Bearer token)
        const token = localStorage.getItem("access_token") ?? ""
        actions.connect(id, token)
      } catch {
        // Already a member — still connect
        const token = localStorage.getItem("access_token") ?? ""
        actions.connect(id, token)
      }
    }
    joinAndConnect()

    // Send heartbeat every 5s while page is open
    heartbeatRef.current = setInterval(() => actions.heartbeat(), 5000)

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      actions.disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function handleStart() {
    apiClient.post(`/sessions/${id}/start`, {}).then(() => {
      actions.startTimer(25 * 60)
    })
  }

  function handleEnd() {
    apiClient.post(`/sessions/${id}/end`, {})
  }

  function handleSubmitUpdate(update: string) {
    apiClient.patch(`/sessions/${id}/update`, { text: update })
    actions.submitUpdate(update)
  }

  if (!room_id) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-50 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Presence */}
      <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-6 mb-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">
          In this session
        </p>
        <PresenceRow members={members} />
      </div>

      {/* Timer */}
      {phase !== "ended" && (
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-8 mb-4 flex flex-col items-center gap-6">
          <div className="text-5xl font-semibold font-mono text-slate-50">
            {formatTime(timer.remaining_sec)}
          </div>

          {phase === "waiting" && is_host && (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium h-10 px-6 rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Start session
            </button>
          )}

          {phase === "waiting" && !is_host && (
            <p className="text-sm text-slate-400">Waiting for host to start…</p>
          )}

          {phase === "running" && is_host && (
            <button
              onClick={handleEnd}
              className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 h-10 px-6 rounded-lg transition-colors"
            >
              <Square className="w-4 h-4" />
              End session
            </button>
          )}

          {phase === "running" && !is_host && (
            <p className="text-sm text-green-500">Session running</p>
          )}
        </div>
      )}

      {/* End cards */}
      {phase === "ended" && (
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-6">
          <SessionEndCards
            members={members}
            currentUserId={currentUserId}
            onSubmit={handleSubmitUpdate}
          />
        </div>
      )}
    </div>
  )
}
