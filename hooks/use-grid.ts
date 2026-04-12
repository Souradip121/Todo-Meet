import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { DayScore } from "@/lib/types"

function localDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function useGrid(commitmentId?: string) {
  const today = localDateStr()
  const base = commitmentId && commitmentId !== "all"
    ? `/scores/grid?commitment_id=${commitmentId}&today=${today}`
    : `/scores/grid?today=${today}`

  return useQuery<DayScore[]>({
    queryKey: ["grid", commitmentId ?? "all"],
    queryFn: () => apiClient.get(base),
    staleTime: 1000 * 60 * 60 * 24, // 24h
  })
}

export function useDayReplay(date: string | null) {
  return useQuery({
    queryKey: ["day-replay", date],
    queryFn: () => apiClient.get(`/scores/day/${date}`),
    enabled: !!date,
    staleTime: 1000 * 60 * 60 * 24,
  })
}
