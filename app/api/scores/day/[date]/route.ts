import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { dailyScores, commitmentLogs, eodDebriefs, recurringCommitments } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { date } = await params

  const [score] = await db
    .select()
    .from(dailyScores)
    .where(and(eq(dailyScores.userId, user.id), eq(dailyScores.date, date)))
    .limit(1)

  const logs = await db
    .select({
      id:              commitmentLogs.id,
      commitmentId:    commitmentLogs.commitmentId,
      date:            commitmentLogs.date,
      durationMinutes: commitmentLogs.durationMinutes,
      note:            commitmentLogs.note,
      photoUrl:        commitmentLogs.photoUrl,
      name:            recurringCommitments.name,
      emoji:           recurringCommitments.emoji,
    })
    .from(commitmentLogs)
    .leftJoin(recurringCommitments, eq(commitmentLogs.commitmentId, recurringCommitments.id))
    .where(and(eq(commitmentLogs.userId, user.id), eq(commitmentLogs.date, date)))

  const [debrief] = await db
    .select()
    .from(eodDebriefs)
    .where(and(eq(eodDebriefs.userId, user.id), eq(eodDebriefs.date, date)))
    .limit(1)

  return NextResponse.json({
    date,
    score:   score?.score ?? 0,
    breakdown: score?.breakdown ?? {},
    logs,
    debrief: debrief ?? null,
  })
}
