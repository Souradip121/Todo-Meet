import Pusher from "pusher"

// Singleton — reuse across requests in the same serverless instance
let pusherInstance: Pusher | null = null

export function getPusherServer(): Pusher {
  if (pusherInstance) return pusherInstance
  pusherInstance = new Pusher({
    appId:   process.env.PUSHER_APP_ID!,
    key:     process.env.PUSHER_KEY!,
    secret:  process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS:  true,
  })
  return pusherInstance
}
