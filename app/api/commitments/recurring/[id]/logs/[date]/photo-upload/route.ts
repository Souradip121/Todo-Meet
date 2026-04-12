import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { commitmentLogs, recurringCommitments } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET!
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"]

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> },
) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id, date } = await params

  // Verify commitment ownership
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

  // Date guard — accept [utcYesterday, utcTomorrow] to cover all timezone offsets
  const now = new Date()
  const utcYesterday = new Date(now); utcYesterday.setUTCDate(now.getUTCDate() - 1)
  const utcTomorrow  = new Date(now); utcTomorrow.setUTCDate(now.getUTCDate() + 1)
  const minDate = utcYesterday.toISOString().slice(0, 10)
  const maxDate = utcTomorrow.toISOString().slice(0, 10)
  if (date < minDate || date > maxDate) {
    return NextResponse.json({ error: "Can only upload photos for today or yesterday" }, { status: 422 })
  }

  // Parse multipart
  const form = await req.formData()
  const file = form.get("file") as File | null
  if (!file) return NextResponse.json({ error: "file is required" }, { status: 422 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Only JPEG, PNG and WebP allowed" }, { status: 422 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Photo must be under 5 MB" }, { status: 422 })

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
  const key = `commitments/${user.id}/${id}/${date}.${ext}`

  // Upload to R2 server-side (no CORS issues)
  const buffer = Buffer.from(await file.arrayBuffer())
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  }))

  // Presigned GET URL — 7-day expiry for display
  const photoUrl = await getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 604800 },
  )

  // Store in DB
  await db
    .update(commitmentLogs)
    .set({ photoUrl })
    .where(and(eq(commitmentLogs.commitmentId, id), eq(commitmentLogs.date, date)))

  return NextResponse.json({ photo_url: photoUrl })
}
