import apiClient from './api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import type { Reminder, ReminderCreateRequest } from '@/types'

export const reminderService = {
  async getReminders(): Promise<Reminder[]> {
    return apiClient.get<Reminder[]>(API_ENDPOINTS.REMINDERS)
  },

  async getReminder(id: string): Promise<Reminder> {
    return apiClient.get<Reminder>(API_ENDPOINTS.REMINDER(id))
  },

  async createReminder(request: ReminderCreateRequest): Promise<Reminder> {
    return apiClient.post<Reminder>(API_ENDPOINTS.REMINDERS, {
      title: request.title,
      description: request.description,
      due_date: request.dueDate,
      priority: request.priority,
    })
  },

  async updateReminder(id: string, request: Partial<ReminderCreateRequest>): Promise<Reminder> {
    return apiClient.put<Reminder>(API_ENDPOINTS.REMINDER(id), {
      title: request.title,
      description: request.description,
      due_date: request.dueDate,
      priority: request.priority,
    })
  },

  async deleteReminder(id: string): Promise<void> {
    await apiClient.delete<void>(API_ENDPOINTS.REMINDER(id))
  },
}
