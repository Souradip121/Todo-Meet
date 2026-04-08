import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { focusSessions } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { getPusherServer } from "@/lib/pusher-server"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const [updated] = await db
    .update(focusSessions)
    .set({ status: "ended", endedAt: new Date() })
    .where(
      and(
        eq(focusSessions.id, id),
        eq(focusSessions.hostId, user.id),
        eq(focusSessions.status, "running"),
      ),
    )
    .returning()

  if (!updated) {
    return NextResponse.json({ error: "Not found, not host, or not running" }, { status: 409 })
  }

  const pusher = getPusherServer()
  await pusher.trigger(`presence-session-${id}`, "session-ended", {
    ended_at: updated.endedAt?.toISOString(),
  })

  return new NextResponse(null, { status: 204 })
}
