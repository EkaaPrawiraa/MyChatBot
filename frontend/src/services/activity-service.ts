import apiClient from './api-client'
import { API_ENDPOINTS, DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { ActivityLog, ActivitiesResponse } from '@/types'

export interface ActivityQueryParams {
  page?: number
  pageSize?: number
  sessionId?: string
}

export const activityService = {
  async getActivities(params?: ActivityQueryParams): Promise<ActivitiesResponse> {
    const searchParams = new URLSearchParams()
    searchParams.set('page', String(params?.page || 1))
    searchParams.set('page_size', String(params?.pageSize || DEFAULT_PAGE_SIZE))
    
    if (params?.sessionId) {
      searchParams.set('session_id', params.sessionId)
    }

    const endpoint = `${API_ENDPOINTS.ACTIVITIES}?${searchParams.toString()}`
    return apiClient.get<ActivitiesResponse>(endpoint)
  },

  async getActivity(id: string): Promise<ActivityLog> {
    return apiClient.get<ActivityLog>(`${API_ENDPOINTS.ACTIVITIES}/${id}`)
  },
}
