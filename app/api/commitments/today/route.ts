import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { recurringCommitments, commitmentLogs } from "@/lib/db/schema"
import { eq, and, lte, or, inArray } from "drizzle-orm"
import { serializeTodayCommitment } from "@/lib/db/serialize"

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  // Prefer client's local date if supplied; fall back to UTC
  const clientToday = req.nextUrl.searchParams.get("today")
  const today = clientToday ?? new Date().toISOString().split("T")[0]

  // Get active + pending_review commitments that have started
  const active = await db
    .select()
    .from(recurringCommitments)
    .where(
      and(
        eq(recurringCommitments.userId, user.id),
        or(
          eq(recurringCommitments.status, "active"),
          eq(recurringCommitments.status, "pending_review"),
        ),
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
        inArray(commitmentLogs.commitmentId, ids),
      ),
    )

  const logMap = new Map(logs.map((l) => [l.commitmentId, l]))

  return NextResponse.json(
    active.map((c) => serializeTodayCommitment(c, logMap.get(c.id))),
  )
}
