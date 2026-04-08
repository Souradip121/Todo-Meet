"use client"

import PusherJs from "pusher-js"

let pusherInstance: PusherJs | null = null

export function getPusherClient(): PusherJs {
  if (pusherInstance) return pusherInstance
  pusherInstance = new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster:      process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    authEndpoint: "/api/sessions/pusher-auth",
    // Session cookie is sent automatically with credentials: 'same-origin' (Pusher default)
  })
  return pusherInstance
}
