import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import type {
  AutomationRule,
  AutomationCreateRequest,
  AutomationUpdateRequest,
} from "@/types";
import { base64DecodeToUtf8, base64EncodeUtf8 } from "@/lib/base64";

type BackendAutomationRule = {
  id: string;
  name: string;
  trigger_type: string;
  condition_json: string; // base64 ([]byte)
  action_json: string; // base64 ([]byte)
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

function mapAutomation(r: BackendAutomationRule): AutomationRule {
  return {
    id: r.id,
    name: r.name,
    trigger: r.trigger_type,
    condition: r.condition_json ? base64DecodeToUtf8(r.condition_json) : "",
    action: r.action_json ? base64DecodeToUtf8(r.action_json) : "",
    enabled: r.enabled,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const automationService = {
  async getAutomations(): Promise<AutomationRule[]> {
    const backend = await apiClient.get<BackendAutomationRule[]>(
      API_ENDPOINTS.AUTOMATIONS,
    );
    return (backend || []).map(mapAutomation);
  },

  async createAutomation(
    request: AutomationCreateRequest,
  ): Promise<AutomationRule> {
    const backend = await apiClient.post<BackendAutomationRule>(
      API_ENDPOINTS.AUTOMATIONS,
      {
        name: request.name,
        trigger_type: request.trigger,
        condition_json: base64EncodeUtf8(request.condition || ""),
        action_json: base64EncodeUtf8(request.action || ""),
        enabled: request.enabled,
      },
    );
    return mapAutomation(backend);
  },

  async updateAutomation(
    id: string,
    request: AutomationUpdateRequest,
  ): Promise<AutomationRule> {
    const backend = await apiClient.put<BackendAutomationRule>(
      API_ENDPOINTS.AUTOMATION(id),
      {
        name: request.name,
        trigger_type: request.trigger,
        condition_json: base64EncodeUtf8(request.condition || ""),
        action_json: base64EncodeUtf8(request.action || ""),
        enabled: request.enabled,
      },
    );
    return mapAutomation(backend);
  },

  async deleteAutomation(id: string): Promise<void> {
    await apiClient.delete<void>(API_ENDPOINTS.AUTOMATION(id));
  },
};
