import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface FeedEvent {
  actor_id: string
  display_name: string
  username: string
  avatar_url: string | null
  event_type: "log_time" | "challenge_checkin" | "debrief_submitted" | "streak_milestone"
  payload: Record<string, unknown>
  created_at: string
}

export interface FriendUser {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
  college_url: string | null
  status: "pending" | "accepted"
  created_at: string
}

export interface SearchResult {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
  college_url: string | null
  friendship_status: "none" | "pending" | "accepted"
}

export function useFeed() {
  return useQuery<FeedEvent[]>({
    queryKey: ["feed"],
    queryFn: () => apiClient.get("/feed"),
    staleTime: 1000 * 60,
  })
}

export function useFriends() {
  return useQuery<FriendUser[]>({
    queryKey: ["friends"],
    queryFn: () => apiClient.get("/friends"),
    staleTime: 1000 * 60 * 5,
  })
}

export function useFriendSearch(q: string, collegeOnly = false) {
  return useQuery<SearchResult[]>({
    queryKey: ["friends", "search", q, collegeOnly],
    queryFn: () => {
      const params = new URLSearchParams({ q })
      if (collegeOnly) params.set("college", "true")
      return apiClient.get(`/friends/search?${params}`)
    },
    enabled: q.length >= 2 || collegeOnly,
    staleTime: 1000 * 30,
  })
}

export function useSendFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/friends/${id}/request`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends"] })
    },
  })
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/friends/${id}/accept`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends"] })
      qc.invalidateQueries({ queryKey: ["feed"] })
    },
  })
}

export function useRemoveFriend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/friends/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends"] })
    },
  })
}
