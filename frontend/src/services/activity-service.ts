import apiClient from "./api-client";
import { API_ENDPOINTS, DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { ActivityLog } from "@/types";
import { base64DecodeToUtf8 } from "@/lib/base64";

export interface ActivityQueryParams {
  page?: number;
  pageSize?: number;
  sessionId?: string;
}

type BackendActivityLog = {
  id: string;
  session_id?: string;
  user_query: string;
  intent: string;
  execution_plan?: string; // base64
  tools_used?: string; // base64
  execution_results?: string; // base64
  success: boolean;
  error_message?: string;
  latency_ms: number;
  token_usage: number;
  created_at: string;
};

function safeJsonParse<T>(input: string): T | undefined {
  try {
    return JSON.parse(input) as T;
  } catch {
    return undefined;
  }
}

function mapActivity(a: BackendActivityLog): ActivityLog {
  const tools = a.tools_used
    ? safeJsonParse<string[]>(base64DecodeToUtf8(a.tools_used))
    : undefined;
  const executionPlan = a.execution_plan
    ? base64DecodeToUtf8(a.execution_plan)
    : undefined;

  return {
    id: a.id,
    sessionId: a.session_id || "",
    query: a.user_query,
    intent: a.intent,
    tools: tools || [],
    success: a.success,
    error: a.error_message,
    latency: a.latency_ms,
    executionPlan,
    createdAt: a.created_at,
  };
}

export const activityService = {
  async getActivities(params?: ActivityQueryParams): Promise<ActivityLog[]> {
    const searchParams = new URLSearchParams();
    const pageSize = params?.pageSize || DEFAULT_PAGE_SIZE;
    const page = params?.page || 1;
    searchParams.set("limit", String(pageSize));
    searchParams.set("offset", String((page - 1) * pageSize));

    const endpoint = `${API_ENDPOINTS.ACTIVITIES}?${searchParams.toString()}`;
    const backend = await apiClient.get<BackendActivityLog[]>(endpoint);
    return (backend || []).map(mapActivity);
  },
};
