import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Commitment } from "@/lib/types"

export function useTodayCommitments() {
  return useQuery<Commitment[]>({
    queryKey: ["commitments", "today"],
    queryFn: () => apiClient.get("/commitments"),
    staleTime: 1000 * 60,  // 1 min
  })
}

export function useCompleteCommitment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, honest_score }: { id: string; honest_score?: number }) =>
      apiClient.patch(`/commitments/${id}/complete`, { honest_score }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commitments"] }),
  })
}

export function useCarryCommitment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/commitments/${id}/carry`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commitments"] }),
  })
}

