import { useQuery } from '@tanstack/react-query'
import { activityService, type ActivityQueryParams } from '@/src/services/activity-service'
import { QUERY_KEYS } from '@/lib/constants'

export function useActivities(params?: ActivityQueryParams) {
  return useQuery({
    queryKey: ['activities', params?.page, params?.pageSize, params?.sessionId],
    queryFn: () => activityService.getActivities(params),
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useActivity(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.ACTIVITY(id),
    queryFn: () => activityService.getActivity(id),
    staleTime: 60 * 1000, // 1 minute
  })
}
