import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { recurringCommitments, commitmentLogs } from "@/lib/db/schema"
import { eq, and, lte, ne, sql } from "drizzle-orm"

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const today = new Date().toISOString().split("T")[0]

  // Get active commitments that have started
  const active = await db
    .select()
    .from(recurringCommitments)
    .where(
      and(
        eq(recurringCommitments.userId, user.id),
        eq(recurringCommitments.status, "active"),
        lte(recurringCommitments.startDate, today),
      ),
    )

  if (active.length === 0) return NextResponse.json([])

  // Get today's logs for these commitments
  const ids = active.map((c) => c.id)
  const logs = await db
    .select()
    .from(commitmentLogs)
    .where(
      and(
        eq(commitmentLogs.userId, user.id),
        eq(commitmentLogs.date, today),
        sql`commitment_id = ANY(${ids})`,
      ),
    )

  const logMap = new Map(logs.map((l) => [l.commitmentId, l]))

  return NextResponse.json(
    active.map((c) => ({
      ...c,
      today_log: logMap.get(c.id) ?? null,
      logged_today: logMap.has(c.id),
    })),
  )
}
