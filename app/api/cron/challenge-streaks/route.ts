import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Reset streak for participants who didn't check in yesterday
  const result = await db.execute(sql`
    UPDATE challenge_participants
    SET current_streak = 0
    WHERE current_streak > 0
      AND (last_checkin_date IS NULL OR last_checkin_date < CURRENT_DATE - 1)
  `)

  return NextResponse.json({ ok: true })
}
