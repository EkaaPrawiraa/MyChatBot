import apiClient from './api-client'
import { API_ENDPOINTS, DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { LongTermMemory, MemorySearchResponse } from '@/types'

export interface MemorySearchParams {
  query: string
  limit?: number
}

export const memoryService = {
  async searchMemory(params: MemorySearchParams): Promise<MemorySearchResponse> {
    const searchParams = new URLSearchParams()
    searchParams.set('q', params.query)
    searchParams.set('limit', String(params.limit || DEFAULT_PAGE_SIZE))

    const endpoint = `${API_ENDPOINTS.MEMORY_SEARCH}?${searchParams.toString()}`
    return apiClient.get<MemorySearchResponse>(endpoint)
  },

  async getRecentMemory(limit?: number): Promise<LongTermMemory[]> {
    const searchParams = new URLSearchParams()
    searchParams.set('limit', String(limit || DEFAULT_PAGE_SIZE))

    const endpoint = `${API_ENDPOINTS.MEMORY_RECENT}?${searchParams.toString()}`
    const response = await apiClient.get<{ memories: LongTermMemory[] }>(endpoint)
    return response.memories || []
  },
}
