"use client"

import { useRef, useState } from "react"
import { Camera, X, Loader2 } from "lucide-react"
import { uploadCommitmentPhoto, usePhotoInvalidator } from "@/hooks/use-photo-upload"

interface PhotoUploadButtonProps {
  commitmentId: string
  date: string
  existingPhotoUrl?: string | null
  onUploaded?: (url: string) => void
}

export function PhotoUploadButton({
  commitmentId,
  date,
  existingPhotoUrl,
  onUploaded,
}: PhotoUploadButtonProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(existingPhotoUrl ?? null)
  const inputRef = useRef<HTMLInputElement>(null)
  const invalidate = usePhotoInvalidator(commitmentId)

  async function handleFile(file: File) {
    setError(null)
    setUploading(true)
    try {
      const url = await uploadCommitmentPhoto(file, commitmentId, date)
      setPreview(url)
      invalidate()
      onUploaded?.(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt="Proof"
            className="w-10 h-10 object-cover cursor-pointer"
            style={{ border: "1.5px solid var(--card-border)" }}
            onClick={() => window.open(preview, "_blank")}
            title="View photo"
          />
          <button
            onClick={() => { setPreview(null); inputRef.current?.click() }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "var(--ink)", color: "var(--paper)" }}
            title="Replace photo"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ) : uploading ? (
        <div className="w-10 h-10 flex items-center justify-center" style={{ border: "1.5px solid var(--card-border)" }}>
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--ink-faint)" }} />
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-2 h-8 transition-colors"
          style={{
            fontFamily: "var(--font-ibm-mono), monospace",
            fontSize: "0.65rem",
            letterSpacing: "0.08em",
            color: "var(--ink-faint)",
            border: "1px dashed var(--card-border)",
            background: "transparent",
            cursor: "pointer",
          }}
          title="Add photo proof"
        >
          <Camera className="w-3.5 h-3.5" />
          proof
        </button>
      )}

      {error && (
        <p style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.65rem", color: "var(--red-ink)" }}>
          {error}
        </p>
      )}
    </div>
  )
}
