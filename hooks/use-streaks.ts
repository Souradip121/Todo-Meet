import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { StreakData } from "@/lib/types"

export function useStreaks() {
  return useQuery<StreakData>({
    queryKey: ["streaks"],
    queryFn: () => apiClient.get("/debriefs/streak"),
    staleTime: 1000 * 60 * 5,
  })
}

export function useFreezeStreak() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post("/streaks/freeze", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["streaks"] }),
  })
}

