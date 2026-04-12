import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { users, recurringCommitments } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { Resend } from "resend"
import { welcomeEmail } from "@/lib/email-templates"

export async function POST() {
  const { user, error } = await requireAuth()
  if (error) return error

  // Fetch current user to check onboardingComplete
  const [profile] = await db
    .select({ onboardingComplete: users.onboardingComplete, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // Idempotent — only run once
  if (profile.onboardingComplete) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  // Mark onboarding complete
  await db
    .update(users)
    .set({ onboardingComplete: true, updatedAt: new Date() })
    .where(eq(users.id, user.id))

  // Get first commitment for personalisation
  const [firstCommitment] = await db
    .select({ name: recurringCommitments.name, emoji: recurringCommitments.emoji })
    .from(recurringCommitments)
    .where(and(eq(recurringCommitments.userId, user.id)))
    .limit(1)

  // Send welcome email if Resend is configured
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "skip" && profile.email) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { subject, html } = welcomeEmail({
      name: profile.name || "there",
      commitmentName: firstCommitment?.name ?? "your commitment",
      commitmentEmoji: firstCommitment?.emoji ?? "⚡",
    })

    await resend.emails.send({
      from:    "showup.day <hello@showup.day>",
      to:      profile.email,
      subject,
      html,
    }).catch(() => null) // don't fail onboarding if email fails
  }

  return NextResponse.json({ ok: true })
}
