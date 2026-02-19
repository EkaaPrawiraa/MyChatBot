import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sessionService, type SessionCreateRequest, type SessionUpdateRequest } from '@/src/services/session-service'
import { QUERY_KEYS } from '@/lib/constants'

export function useSessions() {
  return useQuery({
    queryKey: QUERY_KEYS.SESSIONS,
    queryFn: () => sessionService.getSessions(),
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useSession(id: string | null) {
  return useQuery({
    queryKey: id ? QUERY_KEYS.SESSION(id) : [],
    queryFn: () => {
      if (!id) throw new Error('Session ID is required')
      return sessionService.getSession(id)
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

export function useCreateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request?: SessionCreateRequest) => sessionService.createSession(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SESSIONS })
    },
  })
}

export function useUpdateSession(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: SessionUpdateRequest) => sessionService.updateSession(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SESSION(id) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SESSIONS })
    },
  })
}

export function useCloseSession(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => sessionService.closeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SESSION(id) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SESSIONS })
    },
  })
}

export function useDeleteSession(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => sessionService.deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SESSIONS })
    },
  })
}
