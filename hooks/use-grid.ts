import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { DayScore } from "@/lib/types"

export function useGrid(tag?: string) {
  const endpoint = tag && tag !== "all"
    ? `/scores/grid?tag=${tag}`
    : "/scores/grid"

  return useQuery<DayScore[]>({
    queryKey: ["grid", tag ?? "all"],
    queryFn: () => apiClient.get(endpoint),
    staleTime: 1000 * 60 * 60 * 24,  // 24h
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

