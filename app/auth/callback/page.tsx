import { redirect } from "next/navigation"

// better-auth handles OAuth callbacks at /api/auth/callback/linkedin automatically.
// This page is no longer needed.
export default function AuthCallbackPage() {
  redirect("/dashboard")
}
