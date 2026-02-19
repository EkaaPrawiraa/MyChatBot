import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { approvalService, type ApprovalActionRequest } from '@/src/services/approval-service'
import { QUERY_KEYS } from '@/lib/constants'

export function useApprovals() {
  return useQuery({
    queryKey: QUERY_KEYS.APPROVALS,
    queryFn: () => approvalService.getApprovals(),
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useApproval(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.APPROVAL(id),
    queryFn: () => approvalService.getApproval(id),
    staleTime: 30 * 1000,
  })
}

export function useApproveApproval(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request?: ApprovalActionRequest) => approvalService.approveApproval(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPROVAL(id) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPROVALS })
    },
  })
}

export function useRejectApproval(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request?: ApprovalActionRequest) => approvalService.rejectApproval(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPROVAL(id) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPROVALS })
    },
  })
}
