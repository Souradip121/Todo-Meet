import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getPusherServer } from "@/lib/pusher-server"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const [profile] = await db
    .select({ name: users.name, image: users.image })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  const body = await req.text()
  const formParams = new URLSearchParams(body)
  const socketId     = formParams.get("socket_id")!
  const channelName  = formParams.get("channel_name")!

  const pusher = getPusherServer()
  const authResponse = pusher.authorizeChannel(socketId, channelName, {
    user_id:   user.id,
    user_info: {
      display_name: profile?.name ?? user.name,
      avatar_url:   profile?.image ?? user.image,
    },
  })

  return NextResponse.json(authResponse)
}
