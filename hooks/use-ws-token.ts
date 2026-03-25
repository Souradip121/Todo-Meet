import { apiClient } from "@/lib/api-client"

// Get a short-lived WebSocket auth token before connecting
export async function getWsToken(): Promise<string> {
  const res = await apiClient.post<{ token: string }>("/ws/token", {})
  return res.token
}

