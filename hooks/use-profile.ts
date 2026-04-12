import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { updateProfile } from "@/lib/auth-client"


export interface UserProfile {
  id: string
  email: string
  username: string
  display_name: string
  avatar_url: string | null
  college_url: string | null
  college: string | null
  timezone: string
  current_focus: string | null
  streak_freezes_remaining: number
  persona_level: number
  onboarding_complete: boolean
}

export function useProfile() {
  return useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: () => apiClient.get("/users/me"),
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      display_name?: string
      college_url?: string | null
      college?: string | null
      avatar_url?: string | null
      timezone?: string
    }) => updateProfile(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] })
    },
  })
}
