const API_URL = process.env.API_URL || "http://localhost:8080"

export async function apiFetchServer(endpoint: string, options: RequestInit = {}, token?: string) {
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}
