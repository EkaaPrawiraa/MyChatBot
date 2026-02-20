import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  automationService,
  type AutomationCreateRequest,
  type AutomationUpdateRequest,
} from "@/src/services/automation-service";
import { QUERY_KEYS } from "@/lib/constants";

export function useAutomations() {
  return useQuery({
    queryKey: QUERY_KEYS.AUTOMATIONS,
    queryFn: () => automationService.getAutomations(),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AutomationCreateRequest) =>
      automationService.createAutomation(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTOMATIONS });
    },
  });
}

export function useUpdateAutomation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AutomationUpdateRequest) =>
      automationService.updateAutomation(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTOMATIONS });
    },
  });
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => automationService.deleteAutomation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTOMATIONS });
    },
  });
}
