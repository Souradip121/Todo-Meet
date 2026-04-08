import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { commitmentLogs, recurringCommitments } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id, date } = await params

  const [commitment] = await db
    .select({ id: recurringCommitments.id })
    .from(recurringCommitments)
    .where(and(eq(recurringCommitments.id, id), eq(recurringCommitments.userId, user.id)))
    .limit(1)
  if (!commitment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const today = new Date().toISOString().split("T")[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
  if (date !== today && date !== yesterday) {
    return NextResponse.json({ error: "Date guard: today or yesterday only" }, { status: 422 })
  }

  const { photo_url } = await req.json()
  if (!photo_url) return NextResponse.json({ error: "photo_url required" }, { status: 422 })

  const [updated] = await db
    .update(commitmentLogs)
    .set({ photoUrl: photo_url })
    .where(and(eq(commitmentLogs.commitmentId, id), eq(commitmentLogs.date, date)))
    .returning()

  if (!updated) return NextResponse.json({ error: "Log not found" }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id, date } = await params

  const [commitment] = await db
    .select({ id: recurringCommitments.id })
    .from(recurringCommitments)
    .where(and(eq(recurringCommitments.id, id), eq(recurringCommitments.userId, user.id)))
    .limit(1)
  if (!commitment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const today = new Date().toISOString().split("T")[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
  if (date !== today && date !== yesterday) {
    return NextResponse.json({ error: "Date guard: today or yesterday only" }, { status: 422 })
  }

  await db
    .update(commitmentLogs)
    .set({ photoUrl: null })
    .where(and(eq(commitmentLogs.commitmentId, id), eq(commitmentLogs.date, date)))

  return new NextResponse(null, { status: 204 })
}
