import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { GroupCommitment, GroupMember } from "@/lib/types"

interface GroupDetail {
  group: GroupCommitment
  members: (GroupMember & { today_score: number })[]
  my_role: "host" | "member"
}

export function useGroups() {
  return useQuery<GroupCommitment[]>({
    queryKey: ["groups"],
    queryFn: () => apiClient.get("/groups"),
    staleTime: 1000 * 60 * 5,
  })
}

export function useGroup(id: string) {
  return useQuery<GroupDetail>({
    queryKey: ["group", id],
    queryFn: () => apiClient.get(`/groups/${id}`),
    staleTime: 1000 * 30,
    enabled: !!id,
  })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { title: string; description?: string; duration_days?: number }) =>
      apiClient.post("/groups", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  })
}

export function useJoinGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invite_code: string) => apiClient.post("/groups/join", { invite_code }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  })
}

export function useLeaveGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) => apiClient.post(`/groups/${groupId}/leave`, {}),
    onSuccess: (_data, groupId) => {
      qc.invalidateQueries({ queryKey: ["groups"] })
      qc.removeQueries({ queryKey: ["group", groupId] })
    },
  })
}

export function useNudge(groupId: string) {
  return useMutation({
    mutationFn: (targetUserId: string) =>
      apiClient.post(`/groups/${groupId}/nudge/${targetUserId}`, {}),
  })
}

export function useArchiveGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) => apiClient.delete(`/groups/${groupId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  })
}
