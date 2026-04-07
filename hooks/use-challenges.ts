import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface Challenge {
  id: string
  title: string
  category: string
  duration_days: number
  check_in_rule: string
  start_date: string
  end_date: string
  status: "upcoming" | "active" | "ended"
  is_official: boolean
  stakes_enabled: boolean
  rules: string[]
  participant_count: number
  still_going: number
  total_staked_paise: number
  joined: boolean
  day_number: number
  days_remaining: number
}

export interface LeaderboardEntry {
  user_id: string
  display_name: string
  username: string
  avatar_url: string | null
  current_streak: number
  total_checkins: number
  rank: number
  is_me: boolean
}

export function useChallenges(status?: string) {
  const endpoint = status ? `/challenges?status=${status}` : "/challenges"
  return useQuery<Challenge[]>({
    queryKey: ["challenges", status ?? "all"],
    queryFn: () => apiClient.get(endpoint),
    staleTime: 1000 * 60 * 2,
  })
}

export function useChallenge(id: string) {
  return useQuery<Challenge>({
    queryKey: ["challenge", id],
    queryFn: () => apiClient.get(`/challenges/${id}`),
    staleTime: 1000 * 60,
    enabled: !!id,
  })
}

export function useLeaderboard(challengeId: string, period: "weekly" | "alltime" = "weekly") {
  return useQuery<{ entries: LeaderboardEntry[]; my_entry: LeaderboardEntry | null }>({
    queryKey: ["leaderboard", challengeId, period],
    queryFn: () => apiClient.get(`/challenges/${challengeId}/leaderboard?period=${period}`),
    staleTime: 1000 * 60 * 15,
    enabled: !!challengeId,
  })
}

export function useJoinChallenge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stakeAmountPaise = 0 }: { id: string; stakeAmountPaise?: number }) =>
      apiClient.post(`/challenges/${id}/join`, { stake_amount_paise: stakeAmountPaise }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenges"] })
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to join"
      alert(msg)
    },
  })
}

export function useCheckin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, photoUrl }: { id: string; photoUrl?: string }) =>
      apiClient.post(`/challenges/${id}/checkin`, { photo_url: photoUrl }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["leaderboard", id] })
      qc.invalidateQueries({ queryKey: ["challenges"] })
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to check in"
      alert(msg)
    },
  })
}
