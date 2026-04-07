import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface SignedUploadParams {
  upload_url: string
  api_key: string
  timestamp: number
  signature: string
  folder: string
}

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

/**
 * Upload a photo for a commitment log.
 * 1. Get signed params from backend
 * 2. POST directly to Cloudinary (no backend bandwidth)
 * 3. Confirm the URL with backend
 */
export async function uploadCommitmentPhoto(
  file: File,
  commitmentId: string,
  date: string
): Promise<string> {
  if (file.size > MAX_SIZE) throw new Error("Photo must be under 5MB")
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Only JPEG, PNG and WebP allowed")

  // Step 1: get signed upload params
  const params = await apiClient.post<SignedUploadParams>(
    `/commitments/recurring/${commitmentId}/logs/${date}/photo-sign`,
    {}
  )

  // Step 2: upload directly to Cloudinary
  const form = new FormData()
  form.append("file", file)
  form.append("api_key", params.api_key)
  form.append("timestamp", String(params.timestamp))
  form.append("signature", params.signature)
  form.append("folder", params.folder)

  const upload = await fetch(params.upload_url, { method: "POST", body: form })
  if (!upload.ok) throw new Error("Upload to Cloudinary failed")
  const result = await upload.json()
  const photoUrl: string = result.secure_url

  // Step 3: store URL in backend
  await apiClient.patch(`/commitments/recurring/${commitmentId}/logs/${date}/photo`, {
    photo_url: photoUrl,
  })

  return photoUrl
}

/**
 * Hook to invalidate queries after a successful photo upload.
 */
export function usePhotoInvalidator(commitmentId: string) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ["commitments", "today"] })
    qc.invalidateQueries({ queryKey: ["commitment", commitmentId] })
  }
}
