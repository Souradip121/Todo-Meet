import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { feedReactions } from "@/lib/db/schema"
import { and, eq, sql } from "drizzle-orm"

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { actor_id, event_type, event_date } = await req.json()
  if (!actor_id || !event_type || !event_date) {
    return NextResponse.json({ error: "actor_id, event_type, event_date required" }, { status: 422 })
  }

  // Check existing reaction
  const [existing] = await db
    .select({ id: feedReactions.id })
    .from(feedReactions)
    .where(
      and(
        eq(feedReactions.actorId, actor_id),
        eq(feedReactions.eventType, event_type),
        eq(feedReactions.eventDate, event_date),
        eq(feedReactions.reactorId, user.id),
      )
    )
    .limit(1)

  if (existing) {
    // Un-react
    await db.delete(feedReactions).where(eq(feedReactions.id, existing.id))
  } else {
    // React
    await db.insert(feedReactions).values({
      actorId:   actor_id,
      eventType: event_type,
      eventDate: event_date,
      reactorId: user.id,
    })
  }

  // Return new count + whether current user has reacted
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(feedReactions)
    .where(
      and(
        eq(feedReactions.actorId, actor_id),
        eq(feedReactions.eventType, event_type),
        eq(feedReactions.eventDate, event_date),
      )
    )

  return NextResponse.json({ inspired: !existing, inspired_count: count })
}
