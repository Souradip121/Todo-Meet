import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type {
  RecurringCommitment,
  CommitmentDetail,
  TodayCommitment,
  CommitmentStatPoint,
} from "@/lib/types"

export function useCommitments(includeArchived = false) {
  return useQuery<RecurringCommitment[]>({
    queryKey: ["commitments", { archived: includeArchived }],
    queryFn: () =>
      apiClient.get(`/commitments/recurring${includeArchived ? "?archived=true" : ""}`),
    staleTime: 1000 * 60,
  })
}

export function useCommitment(id: string) {
  return useQuery<CommitmentDetail>({
    queryKey: ["commitment", id],
    queryFn: () => apiClient.get(`/commitments/recurring/${id}`),
    staleTime: 1000 * 30,
    enabled: !!id,
  })
}

export function useTodayCommitments() {
  return useQuery<TodayCommitment[]>({
    queryKey: ["commitments", "today"],
    queryFn: () => apiClient.get("/commitments/today"),
    staleTime: 1000 * 30,
  })
}

export function useCreateCommitment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      name: string
      emoji?: string
      color?: string
      description?: string
      target_min_day?: number
      period_days?: number
    }) => apiClient.post<{ id: string }>("/commitments/recurring", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commitments"] }),
  })
}

export function useUpdateCommitment(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      name?: string
      emoji?: string
      color?: string
      target_min_day?: number
    }) => apiClient.patch(`/commitments/recurring/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commitment", id] })
      qc.invalidateQueries({ queryKey: ["commitments"] })
    },
  })
}

export function useArchiveCommitment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/commitments/recurring/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commitments"] }),
  })
}

export function useRenewCommitment(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post(`/commitments/recurring/${id}/renew`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commitment", id] })
      qc.invalidateQueries({ queryKey: ["commitments"] })
    },
  })
}

export function useLogTime(commitmentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      date?: string
      duration_minutes: number
      time_start?: string
      time_end?: string
      note?: string
    }) => apiClient.post(`/commitments/recurring/${commitmentId}/logs`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commitments", "today"] })
      qc.invalidateQueries({ queryKey: ["commitment", commitmentId] })
      qc.invalidateQueries({ queryKey: ["grid"] })
      setTimeout(() => qc.invalidateQueries({ queryKey: ["streaks"] }), 500)
    },
  })
}

export function useDeleteLog(commitmentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (date: string) =>
      apiClient.delete(`/commitments/recurring/${commitmentId}/logs/${date}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commitments", "today"] })
      qc.invalidateQueries({ queryKey: ["commitment", commitmentId] })
    },
  })
}

export function useCommitmentStats(id: string, period: "weekly" | "monthly") {
  return useQuery<CommitmentStatPoint[]>({
    queryKey: ["commitment-stats", id, period],
    queryFn: () => apiClient.get(`/commitments/recurring/${id}/stats/${period}`),
    staleTime: 1000 * 60 * 5,
    enabled: !!id,
  })
}

export function useShareCommitment(id: string) {
  return useMutation({
    mutationFn: () => apiClient.post<{ token: string }>(`/commitments/recurring/${id}/share`, {}),
  })
}
