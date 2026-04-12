import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"
import { Resend } from "resend"
import { dailyReminderEmail } from "@/lib/email-templates"

export const maxDuration = 60

// Compute which hash slot to send for based on current UTC time:
//   15:30 UTC = 9:00 PM IST  → slot 0
//   17:00 UTC = 10:30 PM IST → slot 1
//   17:30 UTC = 11:00 PM IST → slot 2
function currentSlot(): number | null {
  const now = new Date()
  const h = now.getUTCHours()
  const m = now.getUTCMinutes()

  if (h === 15 && m >= 25 && m <= 35) return 0
  if (h === 17 && m >= 0  && m <= 10) return 1
  if (h === 17 && m >= 25 && m <= 35) return 2

  // Fallback: accept any call and use the slot passed via ?slot= for manual testing
  return null
}

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "skip") {
    return NextResponse.json({ ok: true, skipped: "no RESEND_API_KEY" })
  }

  // Allow ?slot=0|1|2 override for manual testing; otherwise compute from current time
  const slotParam = req.nextUrl.searchParams.get("slot")
  const slot = slotParam !== null ? parseInt(slotParam) : (currentSlot() ?? 0)

  const resend = new Resend(process.env.RESEND_API_KEY)

  // Query users in this slot who have active commitments and haven't logged anything today
  const rows = await db.execute(sql`
    SELECT
      u.id,
      u.name,
      u.email,
      json_agg(json_build_object('name', rc.name, 'emoji', rc.emoji) ORDER BY rc.created_at) AS pending
    FROM users u
    JOIN recurring_commitments rc ON rc.user_id = u.id AND rc.status = 'active'
    WHERE ABS(HASHTEXT(u.id)) % 3 = ${slot}
      AND u.email IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM commitment_logs cl
        WHERE cl.user_id = u.id AND cl.date = CURRENT_DATE
      )
    GROUP BY u.id, u.name, u.email
    LIMIT 200
  `)

  let sent = 0
  for (const row of rows.rows as { id: string; name: string; email: string; pending: { name: string; emoji: string }[] }[]) {
    try {
      const pending = Array.isArray(row.pending) ? row.pending : []
      if (pending.length === 0) continue

      const { subject, html } = dailyReminderEmail({ name: row.name || "there", pending })

      await resend.emails.send({
        from:    "showup.day <hello@showup.day>",
        to:      row.email,
        subject,
        html,
      })

      sent++
    } catch {
      // Continue on individual failure
    }
  }

  return NextResponse.json({ ok: true, slot, sent, total: rows.rows.length })
}
