"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DeclarePage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/commitments/today")
  }, [router])
  return null
}
