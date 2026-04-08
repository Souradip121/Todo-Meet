import { redirect } from "next/navigation"

// Registration is handled by LinkedIn OAuth — no separate sign-up flow.
export default function RegisterPage() {
  redirect("/login")
}
