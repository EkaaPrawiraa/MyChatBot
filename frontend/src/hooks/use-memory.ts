import { useQuery } from '@tanstack/react-query'
import { memoryService, type MemorySearchParams } from '@/src/services/memory-service'
import { QUERY_KEYS } from '@/lib/constants'

export function useMemorySearch(params: MemorySearchParams) {
  return useQuery({
    queryKey: QUERY_KEYS.MEMORY_SEARCH(params.query),
    queryFn: () => memoryService.searchMemory(params),
    enabled: !!params.query && params.query.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useRecentMemory(limit?: number) {
  return useQuery({
    queryKey: QUERY_KEYS.MEMORY_RECENT,
    queryFn: () => memoryService.getRecentMemory(limit),
    staleTime: 30 * 1000, // 30 seconds
  })
}
