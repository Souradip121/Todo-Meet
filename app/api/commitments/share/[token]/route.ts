import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { commitmentShares, recurringCommitments, commitmentLogs, users } from "@/lib/db/schema"
import { eq, and, gte } from "drizzle-orm"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  const [share] = await db
    .select()
    .from(commitmentShares)
    .where(eq(commitmentShares.token, token))
    .limit(1)

  if (!share) return NextResponse.json({ error: "Share not found" }, { status: 404 })

  const [commitment] = await db
    .select()
    .from(recurringCommitments)
    .where(eq(recurringCommitments.id, share.commitmentId))
    .limit(1)

  if (!commitment) return NextResponse.json({ error: "Commitment not found" }, { status: 404 })

  const [owner] = await db
    .select({ name: users.name, image: users.image, username: users.username })
    .from(users)
    .where(eq(users.id, commitment.userId))
    .limit(1)

  // Determine date range based on weekStart
  let logs
  if (share.weekStart) {
    const weekEnd = new Date(share.weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    logs = await db
      .select()
      .from(commitmentLogs)
      .where(
        and(
          eq(commitmentLogs.commitmentId, share.commitmentId),
          gte(commitmentLogs.date, share.weekStart),
          // lte handled by the week end
        ),
      )
  } else {
    const yearAgo = new Date()
    yearAgo.setFullYear(yearAgo.getFullYear() - 1)
    logs = await db
      .select()
      .from(commitmentLogs)
      .where(
        and(
          eq(commitmentLogs.commitmentId, share.commitmentId),
          gte(commitmentLogs.date, yearAgo.toISOString().split("T")[0]),
        ),
      )
  }

  return NextResponse.json({
    commitment,
    owner: { ...owner, display_name: owner?.name, avatar_url: owner?.image },
    logs,
    week_start: share.weekStart,
  })
}
