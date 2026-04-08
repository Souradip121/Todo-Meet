import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

export const maxDuration = 300

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const start = Date.now()

  // Restore 1 streak freeze at start of month for users with 0 remaining
  // who haven't used one yet this month
  await db.execute(sql`
    UPDATE users u
    SET streak_freezes_remaining = 1
    WHERE streak_freezes_remaining = 0
      AND EXTRACT(DAY FROM NOW()) = 1
      AND NOT EXISTS (
        SELECT 1 FROM streak_freeze_uses sfu
        WHERE sfu.user_id = u.id
          AND date_trunc('month', sfu.used_at) = date_trunc('month', NOW())
      )
  `)

  // Compute daily score for all users:
  // score = ROUND((logged_today / active_commitments) * 5) clamped 0-5
  const result = await db.execute(sql`
    INSERT INTO daily_scores (user_id, date, score, breakdown)
    SELECT
      u.id AS user_id,
      CURRENT_DATE AS date,
      LEAST(5, GREATEST(0,
        CASE WHEN active_counts.total_active = 0 THEN 0
             ELSE ROUND(log_counts.logged_today::float / active_counts.total_active * 5)::int
        END
      )) AS score,
      jsonb_build_object(
        'total_active', active_counts.total_active,
        'logged_today', log_counts.logged_today
      ) AS breakdown
    FROM users u
    CROSS JOIN LATERAL (
      SELECT COUNT(*)::int AS total_active
      FROM recurring_commitments rc
      WHERE rc.user_id = u.id
        AND rc.status = 'active'
        AND rc.start_date <= CURRENT_DATE
        AND rc.end_date >= CURRENT_DATE
    ) active_counts
    CROSS JOIN LATERAL (
      SELECT COUNT(DISTINCT cl.commitment_id)::int AS logged_today
      FROM commitment_logs cl
      JOIN recurring_commitments rc ON rc.id = cl.commitment_id
      WHERE cl.user_id = u.id
        AND cl.date = CURRENT_DATE
        AND rc.status = 'active'
    ) log_counts
    ON CONFLICT (user_id, date) DO UPDATE
      SET score = EXCLUDED.score, breakdown = EXCLUDED.breakdown
  `)

  return NextResponse.json({
    ok: true,
    duration_ms: Date.now() - start,
  })
}
