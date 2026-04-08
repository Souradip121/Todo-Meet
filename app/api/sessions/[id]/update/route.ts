import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { sessionMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { getPusherServer } from "@/lib/pusher-server"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const { text } = await req.json()

  const [updated] = await db
    .update(sessionMembers)
    .set({ updateText: text })
    .where(and(eq(sessionMembers.sessionId, id), eq(sessionMembers.userId, user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: "Not a member of this session" }, { status: 404 })

  const pusher = getPusherServer()
  await pusher.trigger(`presence-session-${id}`, "member-update", {
    user_id:     user.id,
    update_text: text,
  })

  return new NextResponse(null, { status: 204 })
}
