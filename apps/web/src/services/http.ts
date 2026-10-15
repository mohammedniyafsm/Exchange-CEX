const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1'
const AUTH_TOKEN_KEY = 'cryptolattice.accessToken'

export function getAccessToken(): string | null {
  return window.sessionStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAccessToken(token: string | null): void {
  if (token) {
    window.sessionStorage.setItem(AUTH_TOKEN_KEY, token)
  } else {
    window.sessionStorage.removeItem(AUTH_TOKEN_KEY)
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  const payload = await response.json().catch(() => null) as { message?: string } | null
  if (!response.ok) {
    if (response.status === 401) setAccessToken(null)
    throw new Error(payload?.message ?? `Request failed (${response.status})`)
  }
  return payload as T
}

export const marketSocketUrl = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8081'
