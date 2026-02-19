import apiClient from './api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import type { ApprovalItem, ApprovalResponse } from '@/types'

export interface ApprovalActionRequest {
  feedback?: string
}

export const approvalService = {
  async getApprovals(): Promise<ApprovalItem[]> {
    return apiClient.get<ApprovalItem[]>(API_ENDPOINTS.APPROVALS)
  },

  async getApproval(id: string): Promise<ApprovalItem> {
    return apiClient.get<ApprovalItem>(API_ENDPOINTS.APPROVAL(id))
  },

  async approveApproval(id: string, request?: ApprovalActionRequest): Promise<ApprovalResponse> {
    return apiClient.post<ApprovalResponse>(API_ENDPOINTS.APPROVE(id), {
      feedback: request?.feedback,
    })
  },

  async rejectApproval(id: string, request?: ApprovalActionRequest): Promise<ApprovalResponse> {
    return apiClient.post<ApprovalResponse>(API_ENDPOINTS.REJECT(id), {
      feedback: request?.feedback,
    })
  },
}
