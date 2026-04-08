"use client"

import { create } from "zustand"

interface Member {
  user_id: string
  display_name: string
  avatar_url: string | null
  update: string | null
}

interface SessionState {
  session_id: string | null
  duration_min: number
  started_at: string | null   // ISO timestamp from server when session went "running"
  members: Member[]
  is_host: boolean
  phase: "waiting" | "running" | "ended"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  channel: any | null         // Pusher PresenceChannel
  actions: {
    connect: (sessionId: string, isHost: boolean, durationMin: number) => void
    disconnect: () => void
    /** Compute remaining seconds from started_at + duration_min */
    getRemainingSeconds: () => number
    submitUpdate: (text: string) => Promise<void>
    setMemberUpdate: (userId: string, update: string) => void
  }
}

export const useSessionStore = create<SessionState>()((set, get) => ({
  session_id: null,
  duration_min: 25,
  started_at: null,
  members: [],
  is_host: false,
  phase: "waiting",
  channel: null,

  actions: {
    connect: (sessionId, isHost, durationMin) => {
      // Dynamic import so pusher-js only loads client-side
      import("@/lib/pusher-client").then(({ getPusherClient }) => {
        const pusher = getPusherClient()
        const channel = pusher.subscribe(`presence-session-${sessionId}`)

        channel.bind("pusher:subscription_succeeded", (data: {
          members: Record<string, { display_name: string; avatar_url: string | null }>
        }) => {
          const members: Member[] = Object.entries(data.members).map(([id, info]) => ({
            user_id:      id,
            display_name: info.display_name,
            avatar_url:   info.avatar_url,
            update:       null,
          }))
          set({ members })
        })

        channel.bind("pusher:member_added", (member: {
          id: string
          info: { display_name: string; avatar_url: string | null }
        }) => {
          set((s) => ({
            members: s.members.some((m) => m.user_id === member.id)
              ? s.members
              : [
                  ...s.members,
                  {
                    user_id:      member.id,
                    display_name: member.info.display_name,
                    avatar_url:   member.info.avatar_url,
                    update:       null,
                  },
                ],
          }))
        })

        channel.bind("pusher:member_removed", (member: { id: string }) => {
          set((s) => ({ members: s.members.filter((m) => m.user_id !== member.id) }))
        })

        channel.bind("session-started", ({ started_at }: { started_at: string }) => {
          set({ phase: "running", started_at })
        })

        channel.bind("session-ended", () => {
          set({ phase: "ended" })
        })

        channel.bind("member-update", ({ user_id, update_text }: { user_id: string; update_text: string }) => {
          set((s) => ({
            members: s.members.map((m) =>
              m.user_id === user_id ? { ...m, update: update_text } : m,
            ),
          }))
        })

        set({
          session_id: sessionId,
          is_host:    isHost,
          duration_min: durationMin,
          channel,
          phase: "waiting",
          started_at: null,
        })
      })
    },

    disconnect: () => {
      const { session_id, channel } = get()
      if (channel && session_id) {
        channel.pusher.unsubscribe(`presence-session-${session_id}`)
      }
      set({ channel: null, session_id: null, members: [], phase: "waiting", started_at: null })
    },

    getRemainingSeconds: () => {
      const { started_at, duration_min, phase } = get()
      if (phase !== "running" || !started_at) return duration_min * 60
      const elapsed = Math.floor((Date.now() - new Date(started_at).getTime()) / 1000)
      return Math.max(0, duration_min * 60 - elapsed)
    },

    submitUpdate: async (text: string) => {
      const { session_id } = get()
      if (!session_id) return
      await fetch(`/api/sessions/${session_id}/update`, {
        method:      "PATCH",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify({ text }),
      })
    },

    setMemberUpdate: (userId, update) => {
      set((s) => ({
        members: s.members.map((m) =>
          m.user_id === userId ? { ...m, update } : m,
        ),
      }))
    },
  },
}))

export const useSessionActions = () => useSessionStore((s) => s.actions)
