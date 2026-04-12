import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { recurringCommitments, commitmentLogs } from "@/lib/db/schema"
import { eq, and, gte, sql } from "drizzle-orm"
import { serializeCommitment, serializeLog } from "@/lib/db/serialize"

export async function GET(
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

  // Fetch last 365 days of logs
  const yearAgo = new Date()
  yearAgo.setFullYear(yearAgo.getFullYear() - 1)
  const logs = await db
    .select()
    .from(commitmentLogs)
    .where(
      and(
        eq(commitmentLogs.commitmentId, id),
        gte(commitmentLogs.date, yearAgo.toISOString().split("T")[0]),
      ),
    )
    .orderBy(commitmentLogs.date)

  return NextResponse.json({ commitment: serializeCommitment(commitment), logs: logs.map(serializeLog) })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if (body.name !== undefined)           updates.name = body.name
  if (body.emoji !== undefined)          updates.emoji = body.emoji
  if (body.color !== undefined)          updates.color = body.color
  if (body.description !== undefined)    updates.description = body.description
  if (body.target_min_day !== undefined) updates.targetMinDay = body.target_min_day

  const [updated] = await db
    .update(recurringCommitments)
    .set(updates)
    .where(and(eq(recurringCommitments.id, id), eq(recurringCommitments.userId, user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(serializeCommitment(updated))
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const [updated] = await db
    .update(recurringCommitments)
    .set({ status: "archived" })
    .where(and(eq(recurringCommitments.id, id), eq(recurringCommitments.userId, user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
