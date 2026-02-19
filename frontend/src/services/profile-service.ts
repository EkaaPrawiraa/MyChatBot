import apiClient from './api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import type { UserProfile } from '@/types'

export interface ProfileUpdateRequest {
  name?: string
  email?: string
  meetingHours?: string
  focusHours?: string
  communicationStyle?: string
  workPattern?: string
}

export const profileService = {
  async getProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>(API_ENDPOINTS.PROFILE)
  },

  async updateProfile(request: ProfileUpdateRequest): Promise<UserProfile> {
    return apiClient.put<UserProfile>(API_ENDPOINTS.PROFILE, {
      name: request.name,
      email: request.email,
      meeting_hours: request.meetingHours,
      focus_hours: request.focusHours,
      communication_style: request.communicationStyle,
      work_pattern: request.workPattern,
    })
  },
}
