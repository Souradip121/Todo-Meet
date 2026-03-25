// API client — wraps all fetch calls to the Go API
// Automatically attaches auth token
// Base URL: NEXT_PUBLIC_API_URL

const BASE_URL = process.env.NEXT_PUBLIC_API_URL

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }))
    throw new Error(error.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
}

