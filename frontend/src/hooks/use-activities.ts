import { useQuery } from "@tanstack/react-query";
import {
  activityService,
  type ActivityQueryParams,
} from "@/src/services/activity-service";

export function useActivities(params?: ActivityQueryParams) {
  return useQuery({
    queryKey: ["activities", params?.page, params?.pageSize, params?.sessionId],
    queryFn: () => activityService.getActivities(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}
