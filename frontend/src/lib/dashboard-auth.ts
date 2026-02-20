import { DASHBOARD_API_KEY_STORAGE_KEY } from '@/lib/constants'

export function getDashboardApiKey(): string {
  // Prefer runtime storage when available (dev convenience)
  if (typeof window !== 'undefined') {
    const key = window.localStorage.getItem(DASHBOARD_API_KEY_STORAGE_KEY)
    if (key) return key
  }

  // Fallback to build-time env (useful for deployments)
  return process.env.NEXT_PUBLIC_API_KEY || ''
}

export function setDashboardApiKey(key: string): void {
  if (typeof window === 'undefined') return
  if (!key) {
    window.localStorage.removeItem(DASHBOARD_API_KEY_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(DASHBOARD_API_KEY_STORAGE_KEY, key)
}
