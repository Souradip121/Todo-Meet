import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { commitmentLogs, recurringCommitments } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  // Verify ownership
  const [commitment] = await db
    .select({ id: recurringCommitments.id })
    .from(recurringCommitments)
    .where(and(eq(recurringCommitments.id, id), eq(recurringCommitments.userId, user.id)))
    .limit(1)
  if (!commitment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { date, duration_minutes, time_start, time_end, note } = body

  if (!date || !duration_minutes || duration_minutes <= 0) {
    return NextResponse.json({ error: "date and duration_minutes > 0 are required" }, { status: 422 })
  }

  // Allow "today or yesterday" in the client's local timezone.
  // UTC clock can be up to 14h behind the client, so we accept anything
  // within [utcYesterday, utcTomorrow] to cover all timezone offsets.
  const now = new Date()
  const utcYesterday = new Date(now); utcYesterday.setUTCDate(now.getUTCDate() - 1)
  const utcTomorrow  = new Date(now); utcTomorrow.setUTCDate(now.getUTCDate() + 1)
  const minDate = utcYesterday.toISOString().slice(0, 10)
  const maxDate = utcTomorrow.toISOString().slice(0, 10)
  if (date < minDate || date > maxDate) {
    return NextResponse.json({ error: "Can only log today or yesterday" }, { status: 422 })
  }

  const [log] = await db
    .insert(commitmentLogs)
    .values({
      commitmentId:    id,
      userId:          user.id,
      date,
      durationMinutes: duration_minutes,
      timeStart:       time_start ?? null,
      timeEnd:         time_end ?? null,
      note:            note ?? null,
    })
    .onConflictDoUpdate({
      target: [commitmentLogs.commitmentId, commitmentLogs.date],
      set: {
        durationMinutes: duration_minutes,
        timeStart:       time_start ?? null,
        timeEnd:         time_end ?? null,
        note:            note ?? null,
      },
    })
    .returning()

  return NextResponse.json(log, { status: 201 })
}
