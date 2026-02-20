import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import type { ApprovalItem, ApprovalResponse } from "@/types";
import { base64DecodeToUtf8 } from "@/lib/base64";

export interface ApprovalActionRequest {
  feedback?: string;
}

type BackendApprovalItem = {
  id: string;
  session_id: string;
  proposed_plan: string; // base64 ([]byte)
  status: "pending" | "approved" | "rejected" | "expired";
  user_feedback?: string;
  modified_plan?: string;
  created_at: string;
  resolved_at?: string;
};

type PlanStep = {
  tool: string;
  input?: Record<string, unknown>;
};

function mapApproval(item: BackendApprovalItem): ApprovalItem {
  let steps: ApprovalItem["steps"] = [];
  let proposedPlan = "";

  if (item.proposed_plan) {
    try {
      proposedPlan = base64DecodeToUtf8(item.proposed_plan);
      const parsed = JSON.parse(proposedPlan) as PlanStep[];
      steps = (parsed || []).map((s, idx) => ({
        id: `${item.id}-step-${idx}`,
        title: s.tool,
        description: s.input ? JSON.stringify(s.input) : "",
        tool: s.tool,
        parameters: s.input || {},
      }));
    } catch {
      steps = [];
    }
  }

  return {
    id: item.id,
    sessionId: item.session_id,
    proposedPlan: proposedPlan,
    steps,
    status: item.status === "expired" ? "rejected" : item.status,
    feedback: item.user_feedback,
    createdAt: item.created_at,
    updatedAt: item.resolved_at || item.created_at,
  };
}

export const approvalService = {
  async getApprovals(): Promise<ApprovalItem[]> {
    const backend = await apiClient.get<BackendApprovalItem[]>(
      API_ENDPOINTS.APPROVALS,
    );
    return (backend || []).map(mapApproval);
  },

  async approveApproval(
    id: string,
    request?: ApprovalActionRequest,
  ): Promise<ApprovalResponse> {
    const resp = await apiClient.post<{ status: string }>(
      API_ENDPOINTS.APPROVE(id),
      {
        feedback: request?.feedback,
      },
    );
    return { id, status: resp.status as "approved" | "rejected" };
  },

  async rejectApproval(
    id: string,
    request?: ApprovalActionRequest,
  ): Promise<ApprovalResponse> {
    const resp = await apiClient.post<{ status: string }>(
      API_ENDPOINTS.REJECT(id),
      {
        feedback: request?.feedback,
      },
    );
    return { id, status: resp.status as "approved" | "rejected" };
  },
};
