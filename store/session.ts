import { create } from "zustand"

interface Member {
  user_id: string
  display_name: string
  avatar_url: string | null
  last_heartbeat: number  // timestamp
  update: string | null
}

interface SessionState {
  room_id: string | null
  commitment_title: string | null
  members: Member[]
  timer: { running: boolean; remaining_sec: number }
  is_host: boolean
  phase: "waiting" | "running" | "ended"
  ws: WebSocket | null
  actions: {
    connect: (roomId: string, wsToken: string) => void
    disconnect: () => void
    startTimer: (duration_sec: number) => void
    pauseTimer: () => void
    endSession: (update: string) => void
    submitUpdate: (update: string) => void
    setMemberUpdate: (user_id: string, update: string) => void
    heartbeat: () => void
  }
}

export const useSessionStore = create<SessionState>()((set, get) => ({
  room_id: null,
  commitment_title: null,
  members: [],
  timer: { running: false, remaining_sec: 0 },
  is_host: false,
  phase: "waiting",
  ws: null,

  actions: {
    connect: (roomId, wsToken) => {
      const ws = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/ws/session/${roomId}?token=${wsToken}`
      )
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        switch (msg.type) {
          case "room_state":
            set({ members: msg.payload.members, timer: msg.payload.timer })
            break
          case "tick":
            set((s) => ({ timer: { ...s.timer, remaining_sec: msg.payload.remaining } }))
            break
          case "member_join":
            set((s) => ({ members: [...s.members, msg.payload] }))
            break
          case "member_leave":
            set((s) => ({ members: s.members.filter((m) => m.user_id !== msg.payload.user_id) }))
            break
          case "session_end":
            set({ phase: "ended" })
            break
        }
      }
      ws.onclose = () => set({ ws: null, phase: "waiting" })
      set({ room_id: roomId, ws, phase: "waiting" })
    },
    disconnect: () => {
      get().ws?.close()
      set({ ws: null, room_id: null, members: [], phase: "waiting" })
    },
    startTimer: (duration_sec) => {
      get().ws?.send(JSON.stringify({ type: "start_timer", payload: { durationSec: duration_sec } }))
    },
    pauseTimer: () => {
      get().ws?.send(JSON.stringify({ type: "pause_timer", payload: {} }))
    },
    endSession: (update) => {
      get().ws?.send(JSON.stringify({ type: "end_session", payload: { update } }))
    },
    submitUpdate: (update) => {
      get().ws?.send(JSON.stringify({ type: "end_session", payload: { update } }))
    },
    setMemberUpdate: (user_id, update) => {
      set((s) => ({
        members: s.members.map((m) => m.user_id === user_id ? { ...m, update } : m)
      }))
    },
    heartbeat: () => {
      get().ws?.send(JSON.stringify({ type: "heartbeat", payload: {} }))
    },
  },
}))

export const useSessionActions = () => useSessionStore((s) => s.actions)

