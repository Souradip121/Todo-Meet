import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { useRouter } from "next/navigation"

interface ActiveSession {
  id: string
  host_id: string
  group_id: string | null
  title: string
  duration_min: number
  status: string
  started_at: string | null
  group_title: string
  member_count: number
}

export function useActiveSessions() {
  return useQuery<ActiveSession[]>({
    queryKey: ["sessions", "active"],
    queryFn: () => apiClient.get("/sessions/active"),
    staleTime: 1000 * 15, // refresh every 15s
    refetchInterval: 1000 * 15,
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (body: { group_id?: string; title: string; duration_min?: number }) =>
      apiClient.post<{ id: string }>("/sessions", body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["sessions", "active"] })
      router.push(`/sessions/${data.id}`)
    },
  })
}
