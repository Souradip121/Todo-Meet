import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { recurringCommitments } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const [commitment] = await db
    .select()
    .from(recurringCommitments)
    .where(and(eq(recurringCommitments.id, id), eq(recurringCommitments.userId, user.id)))
    .limit(1)

  if (!commitment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const today = new Date().toISOString().split("T")[0]
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + commitment.periodDays)

  const [updated] = await db
    .update(recurringCommitments)
    .set({ startDate: today, endDate: endDate.toISOString().split("T")[0], status: "active" })
    .where(eq(recurringCommitments.id, id))
    .returning()

  return NextResponse.json(updated)
}
