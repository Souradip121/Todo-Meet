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
    .set({ status: "running", startedAt: new Date() })
    .where(
      and(
        eq(focusSessions.id, id),
        eq(focusSessions.hostId, user.id),
        eq(focusSessions.status, "waiting"),
      ),
    )
    .returning()

  if (!updated) {
    return NextResponse.json({ error: "Not found, not host, or already started" }, { status: 409 })
  }

  // Notify all clients via Pusher
  const pusher = getPusherServer()
  await pusher.trigger(`presence-session-${id}`, "session-started", {
    started_at: updated.startedAt?.toISOString(),
  })

  return new NextResponse(null, { status: 204 })
}
