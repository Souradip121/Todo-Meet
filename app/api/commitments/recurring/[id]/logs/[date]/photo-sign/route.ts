import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { commitmentLogs, recurringCommitments } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id, date } = await params

  // Verify ownership
  const [commitment] = await db
    .select({ id: recurringCommitments.id })
    .from(recurringCommitments)
    .where(and(eq(recurringCommitments.id, id), eq(recurringCommitments.userId, user.id)))
    .limit(1)
  if (!commitment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Log must exist
  const [log] = await db
    .select({ id: commitmentLogs.id })
    .from(commitmentLogs)
    .where(and(eq(commitmentLogs.commitmentId, id), eq(commitmentLogs.date, date)))
    .limit(1)
  if (!log) return NextResponse.json({ error: "Log entry required before uploading photo" }, { status: 422 })

  // Date guard
  const today = new Date().toISOString().split("T")[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
  if (date !== today && date !== yesterday) {
    return NextResponse.json({ error: "Can only upload photos for today or yesterday" }, { status: 422 })
  }

  // Generate Cloudinary signed upload params
  const timestamp = Math.round(Date.now() / 1000)
  const publicId = `showup/${user.id}/${id}/${date}`
  const cloudName  = process.env.CLOUDINARY_CLOUD_NAME!
  const apiKey     = process.env.CLOUDINARY_API_KEY!
  const apiSecret  = process.env.CLOUDINARY_API_SECRET!

  // Signature: SHA-1 of "public_id=...&timestamp=...{secret}"
  const { createHash } = await import("crypto")
  const strToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`
  const signature = createHash("sha1").update(strToSign).digest("hex")

  return NextResponse.json({
    cloud_name: cloudName,
    api_key:    apiKey,
    timestamp,
    public_id:  publicId,
    signature,
    upload_url: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  })
}
