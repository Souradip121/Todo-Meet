import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { commitmentShares, recurringCommitments } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const [commitment] = await db
    .select({ id: recurringCommitments.id })
    .from(recurringCommitments)
    .where(and(eq(recurringCommitments.id, id), eq(recurringCommitments.userId, user.id)))
    .limit(1)
  if (!commitment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Check for optional ?week=YYYY-MM-DD for week-specific share
  const weekParam = req.nextUrl.searchParams.get("week")

  // Check if share already exists (for this commitment + weekStart combo)
  let existing
  if (weekParam) {
    const matches = await db
      .select()
      .from(commitmentShares)
      .where(and(eq(commitmentShares.commitmentId, id), eq(commitmentShares.weekStart, weekParam)))
      .limit(1)
    existing = matches[0]
  } else {
    const matches = await db
      .select()
      .from(commitmentShares)
      .where(eq(commitmentShares.commitmentId, id))
      .limit(1)
    existing = matches[0]
  }

  if (existing) return NextResponse.json({ token: existing.token })

  const [share] = await db
    .insert(commitmentShares)
    .values({
      commitmentId: id,
      weekStart:    weekParam ?? null,
    })
    .returning()

  return NextResponse.json({ token: share.token }, { status: 201 })
}
