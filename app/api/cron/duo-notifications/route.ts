import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"
import { Resend } from "resend"

export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "skip") {
    return NextResponse.json({ ok: true, skipped: "no RESEND_API_KEY" })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]

  // Find duos where exactly one member missed yesterday
  const duosToNotify = await db.execute(sql`
    SELECT
      g.id AS group_id,
      g.title AS group_title,
      g.invite_code,
      missed.user_id AS missed_user_id,
      missed.name AS missed_user_name,
      present.user_id AS present_user_id,
      present.email AS present_email,
      present.name AS present_name,
      streak.duo_streak
    FROM groups g
    JOIN group_members gm1 ON gm1.group_id = g.id
    JOIN group_members gm2 ON gm2.group_id = g.id AND gm2.user_id != gm1.user_id
    JOIN users missed ON missed.id = gm1.user_id
    JOIN users present ON present.id = gm2.user_id
    CROSS JOIN LATERAL (
      SELECT COUNT(*)::int AS duo_streak
      FROM (
        SELECT DISTINCT cl.date
        FROM commitment_logs cl
        JOIN group_members gm ON gm.user_id = cl.user_id AND gm.group_id = g.id
        GROUP BY cl.date
        HAVING COUNT(DISTINCT cl.user_id) = 2
        ORDER BY cl.date DESC
      ) both_days
    ) streak
    WHERE g.type = 'duo'
      AND g.status = 'active'
      -- missed user didn't log yesterday
      AND NOT EXISTS (
        SELECT 1 FROM commitment_logs cl
        WHERE cl.user_id = gm1.user_id AND cl.date = ${yesterday}
      )
      -- present user DID log yesterday
      AND EXISTS (
        SELECT 1 FROM commitment_logs cl
        WHERE cl.user_id = gm2.user_id AND cl.date = ${yesterday}
      )
      -- not already notified today
      AND NOT EXISTS (
        SELECT 1 FROM duo_notifications dn
        WHERE dn.group_id = g.id AND dn.date = CURRENT_DATE
      )
    LIMIT 100
  `)

  let sent = 0
  for (const row of duosToNotify.rows as Record<string, string>[]) {
    try {
      await resend.emails.send({
        from:    "showup.day <noreply@showup.day>",
        to:      row.present_email,
        subject: `${row.missed_user_name} missed yesterday — streak at risk 🔥`,
        html: `
          <p>Hey ${row.present_name},</p>
          <p>Your duo partner <strong>${row.missed_user_name}</strong> didn't log in <strong>${row.group_title}</strong> yesterday.</p>
          <p>Your duo streak is <strong>${row.duo_streak} days</strong>. Give them a nudge!</p>
          <a href="https://showup.day" style="display:inline-block;background:#6366F1;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;margin-top:16px">Open showup.day</a>
        `,
      })

      // Record to prevent duplicate sends
      await db.execute(sql`
        INSERT INTO duo_notifications (group_id, date)
        VALUES (${row.group_id}, CURRENT_DATE)
        ON CONFLICT (group_id, date) DO NOTHING
      `)

      sent++
    } catch {
      // Continue on individual send failure
    }
  }

  return NextResponse.json({ ok: true, sent })
}
