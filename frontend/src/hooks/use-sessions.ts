import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  sessionService,
  type SessionCreateRequest,
} from "@/src/services/session-service";
import { QUERY_KEYS } from "@/lib/constants";
import type { Message } from "@/types";

export function useSessions() {
  return useQuery({
    queryKey: QUERY_KEYS.SESSIONS,
    queryFn: () => sessionService.getSessions(),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useSession(id: string | null) {
  return useQuery({
    queryKey: id ? QUERY_KEYS.SESSION(id) : [],
    queryFn: () => {
      if (!id) throw new Error("Session ID is required");
      return sessionService.getSession(id);
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useSessionMessages(id: string | null, limit: number = 200) {
  return useQuery<Message[]>({
    queryKey: id ? QUERY_KEYS.SESSION_MESSAGES(id) : [],
    queryFn: () => {
      if (!id) throw new Error("Session ID is required");
      return sessionService.getSessionMessages(id, limit);
    },
    enabled: !!id,
    refetchOnMount: "always",
    staleTime: 5 * 1000,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request?: SessionCreateRequest) =>
      sessionService.createSession(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SESSIONS });
    },
  });
}

export function useCloseSession(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => sessionService.closeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SESSION(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SESSIONS });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sessionService.deleteSession(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SESSIONS });
      queryClient.removeQueries({ queryKey: QUERY_KEYS.SESSION(id) });
      queryClient.removeQueries({ queryKey: QUERY_KEYS.SESSION_MESSAGES(id) });
    },
  });
}
