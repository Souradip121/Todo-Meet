import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { WeeklySummary } from "@/lib/types"

export function useWeeklySummary() {
  return useQuery<WeeklySummary>({
    queryKey: ["weekly-summary"],
    queryFn: () => apiClient.get("/scores/weekly"),
    staleTime: 1000 * 60 * 60,  // 1h
  })
}

