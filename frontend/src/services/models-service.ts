import apiClient from './api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import type { Model, ModelsResponse } from '@/types'

export const modelsService = {
  async getModels(): Promise<Model[]> {
    const response = await apiClient.get<ModelsResponse>(API_ENDPOINTS.MODELS)
    return response.models || []
  },
}
