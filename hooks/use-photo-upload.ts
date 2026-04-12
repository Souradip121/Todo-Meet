import { useQueryClient } from "@tanstack/react-query"

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

/**
 * Upload a photo server-side (avoids R2 CORS).
 * POST multipart/form-data → our API → R2 → returns photo_url.
 */
export async function uploadCommitmentPhoto(
  file: File,
  commitmentId: string,
  date: string
): Promise<string> {
  if (file.size > MAX_SIZE) throw new Error("Photo must be under 5 MB")
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Only JPEG, PNG and WebP allowed")

  const form = new FormData()
  form.append("file", file)

  const res = await fetch(`/api/commitments/recurring/${commitmentId}/logs/${date}/photo-upload`, {
    method: "POST",
    body: form,
    credentials: "include",
  })

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Upload failed" }))
    throw new Error(error ?? "Upload failed")
  }

  const { photo_url } = await res.json()
  return photo_url
}

export function usePhotoInvalidator(commitmentId: string) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ["commitments", "today"] })
    qc.invalidateQueries({ queryKey: ["commitment", commitmentId] })
  }
}
