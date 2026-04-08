import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { commitmentLogs, recurringCommitments } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id, date } = await params

  // Verify ownership
  const [commitment] = await db
    .select({ id: recurringCommitments.id })
    .from(recurringCommitments)
    .where(and(eq(recurringCommitments.id, id), eq(recurringCommitments.userId, user.id)))
    .limit(1)
  if (!commitment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Only today/yesterday
  const today = new Date().toISOString().split("T")[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
  if (date !== today && date !== yesterday) {
    return NextResponse.json({ error: "Can only delete today or yesterday's log" }, { status: 422 })
  }

  await db
    .delete(commitmentLogs)
    .where(and(eq(commitmentLogs.commitmentId, id), eq(commitmentLogs.date, date)))

  return new NextResponse(null, { status: 204 })
}
