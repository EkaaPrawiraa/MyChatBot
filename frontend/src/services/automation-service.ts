import apiClient from './api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import type { AutomationRule, AutomationCreateRequest, AutomationUpdateRequest } from '@/types'

export const automationService = {
  async getAutomations(): Promise<AutomationRule[]> {
    return apiClient.get<AutomationRule[]>(API_ENDPOINTS.AUTOMATIONS)
  },

  async getAutomation(id: string): Promise<AutomationRule> {
    return apiClient.get<AutomationRule>(API_ENDPOINTS.AUTOMATION(id))
  },

  async createAutomation(request: AutomationCreateRequest): Promise<AutomationRule> {
    return apiClient.post<AutomationRule>(API_ENDPOINTS.AUTOMATIONS, {
      name: request.name,
      trigger: request.trigger,
      condition: request.condition,
      action: request.action,
      enabled: request.enabled,
    })
  },

  async updateAutomation(id: string, request: AutomationUpdateRequest): Promise<AutomationRule> {
    return apiClient.put<AutomationRule>(API_ENDPOINTS.AUTOMATION(id), {
      name: request.name,
      trigger: request.trigger,
      condition: request.condition,
      action: request.action,
      enabled: request.enabled,
    })
  },

  async deleteAutomation(id: string): Promise<void> {
    await apiClient.delete<void>(API_ENDPOINTS.AUTOMATION(id))
  },
}
