import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { StreakData } from "@/lib/types"

export function useStreaks() {
  return useQuery<StreakData>({
    queryKey: ["streaks"],
    queryFn: () => apiClient.get("/debriefs/streak"),
    staleTime: 1000 * 60 * 30,  // 30 min
  })
}

