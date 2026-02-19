import apiClient from './api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import type { Session } from '@/types'

export interface SessionCreateRequest {
  title?: string
}

export interface SessionUpdateRequest {
  title?: string
}

export const sessionService = {
  async createSession(request?: SessionCreateRequest): Promise<Session> {
    return apiClient.post<Session>(API_ENDPOINTS.SESSIONS, {
      title: request?.title || `Chat ${new Date().toISOString().split('T')[0]}`,
    })
  },

  async getSessions(): Promise<Session[]> {
    return apiClient.get<Session[]>(API_ENDPOINTS.SESSIONS)
  },

  async getSession(id: string): Promise<Session> {
    return apiClient.get<Session>(API_ENDPOINTS.SESSION(id))
  },

  async updateSession(id: string, request: SessionUpdateRequest): Promise<Session> {
    return apiClient.put<Session>(API_ENDPOINTS.SESSION(id), {
      title: request.title,
    })
  },

  async closeSession(id: string): Promise<Session> {
    return apiClient.post<Session>(API_ENDPOINTS.CLOSE_SESSION(id), {})
  },

  async deleteSession(id: string): Promise<void> {
    await apiClient.delete<void>(API_ENDPOINTS.SESSION(id))
  },
}
