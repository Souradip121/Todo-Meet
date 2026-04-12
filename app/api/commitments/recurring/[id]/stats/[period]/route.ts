import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { commitmentLogs, recurringCommitments } from "@/lib/db/schema"
import { eq, and, gte, lte, sql } from "drizzle-orm"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; period: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id, period } = await params

  // Verify ownership
  const [commitment] = await db
    .select({ id: recurringCommitments.id })
    .from(recurringCommitments)
    .where(and(eq(recurringCommitments.id, id), eq(recurringCommitments.userId, user.id)))
    .limit(1)
  if (!commitment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (period === "weekly") {
    // Last 8 weeks: week_start, total_minutes, days_logged
    const rows = await db.execute(sql`
      SELECT
        date_trunc('week', date::date) AS week_start,
        SUM(duration_minutes)::int AS total_minutes,
        COUNT(DISTINCT date)::int AS days_logged
      FROM commitment_logs
      WHERE commitment_id = ${id}
        AND date >= CURRENT_DATE - INTERVAL '56 days'
      GROUP BY week_start
      ORDER BY week_start
    `)
    return NextResponse.json(rows.rows)
  }

  if (period === "monthly") {
    // Last 12 months: month, total_minutes, days_logged
    const rows = await db.execute(sql`
      SELECT
        to_char(date_trunc('month', date::date), 'YYYY-MM') AS month,
        SUM(duration_minutes)::int AS total_minutes,
        COUNT(DISTINCT date)::int AS days_logged
      FROM commitment_logs
      WHERE commitment_id = ${id}
        AND date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month
    `)
    return NextResponse.json(rows.rows)
  }

  if (period === "vs-weekly") {
    // This week vs prev week — per day breakdown
    const rows = await db.execute(sql`
      WITH week_days AS (
        SELECT generate_series(
          date_trunc('week', CURRENT_DATE),
          date_trunc('week', CURRENT_DATE) + INTERVAL '6 days',
          INTERVAL '1 day'
        )::date AS day
      ),
      prev_week_days AS (
        SELECT generate_series(
          date_trunc('week', CURRENT_DATE) - INTERVAL '7 days',
          date_trunc('week', CURRENT_DATE) - INTERVAL '1 day',
          INTERVAL '1 day'
        )::date AS day
      )
      SELECT
        'current' AS period,
        wd.day,
        COALESCE(cl.duration_minutes, 0) AS minutes
      FROM week_days wd
      LEFT JOIN commitment_logs cl
        ON cl.commitment_id = ${id} AND cl.date = wd.day
      UNION ALL
      SELECT
        'previous' AS period,
        pwd.day,
        COALESCE(cl.duration_minutes, 0) AS minutes
      FROM prev_week_days pwd
      LEFT JOIN commitment_logs cl
        ON cl.commitment_id = ${id} AND cl.date = pwd.day
      ORDER BY period, day
    `)
    const current = rows.rows.filter((r: Record<string, unknown>) => r.period === "current")
    const previous = rows.rows.filter((r: Record<string, unknown>) => r.period === "previous")
    const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const merged = current.map((c: Record<string, unknown>, i: number) => ({
      label: DAY_LABELS[i] ?? String(i + 1),
      current: Number(c.minutes),
      previous: Number((previous[i] as Record<string, unknown>)?.minutes ?? 0),
    }))
    return NextResponse.json(merged)
  }

  if (period === "vs-monthly") {
    // This month vs prev month — per day breakdown
    const rows = await db.execute(sql`
      WITH curr_days AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE),
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS day
      ),
      prev_days AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE) - INTERVAL '1 month',
          date_trunc('month', CURRENT_DATE) - INTERVAL '1 day',
          INTERVAL '1 day'
        )::date AS day
      )
      SELECT 'current' AS period, cd.day, COALESCE(cl.duration_minutes, 0) AS minutes
      FROM curr_days cd
      LEFT JOIN commitment_logs cl ON cl.commitment_id = ${id} AND cl.date = cd.day
      UNION ALL
      SELECT 'previous' AS period, pd.day, COALESCE(cl.duration_minutes, 0) AS minutes
      FROM prev_days pd
      LEFT JOIN commitment_logs cl ON cl.commitment_id = ${id} AND cl.date = pd.day
      ORDER BY period, day
    `)
    const current = rows.rows.filter((r: Record<string, unknown>) => r.period === "current")
    const previous = rows.rows.filter((r: Record<string, unknown>) => r.period === "previous")
    const merged = current.map((c: Record<string, unknown>, i: number) => ({
      label: String(i + 1),
      current: Number(c.minutes),
      previous: Number((previous[i] as Record<string, unknown>)?.minutes ?? 0),
    }))
    return NextResponse.json(merged)
  }

  if (period === "yearly") {
    // All 12 months of current year
    const rows = await db.execute(sql`
      SELECT
        to_char(m.month_start, 'Mon') AS month,
        to_char(m.month_start, 'YYYY-MM') AS month_key,
        COALESCE(SUM(cl.duration_minutes), 0)::int AS minutes,
        COUNT(DISTINCT cl.date)::int AS days_logged
      FROM generate_series(
        date_trunc('year', CURRENT_DATE),
        date_trunc('year', CURRENT_DATE) + INTERVAL '11 months',
        INTERVAL '1 month'
      ) m(month_start)
      LEFT JOIN commitment_logs cl
        ON cl.commitment_id = ${id}
        AND date_trunc('month', cl.date::date) = m.month_start
      GROUP BY m.month_start
      ORDER BY m.month_start
    `)
    return NextResponse.json(rows.rows)
  }

  return NextResponse.json({ error: "Invalid period" }, { status: 400 })
}
