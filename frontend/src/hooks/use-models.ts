import { useQuery } from '@tanstack/react-query'
import { modelsService } from '@/src/services/models-service'
import { QUERY_KEYS } from '@/lib/constants'

export function useModels() {
  return useQuery({
    queryKey: QUERY_KEYS.MODELS,
    queryFn: () => modelsService.getModels(),
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}
