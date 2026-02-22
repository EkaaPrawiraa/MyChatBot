import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import type {
  AutomationRule,
  AutomationCreateRequest,
  AutomationUpdateRequest,
} from "@/types";
import { base64DecodeToUtf8 } from "@/lib/base64";

export type { AutomationCreateRequest, AutomationUpdateRequest } from "@/types";

type BackendAutomationRule = {
  id: string;
  name: string;
  trigger_type?: string;
  condition_json?: string; // base64 ([]byte)
  action_json?: string; // base64 ([]byte)
  enabled: boolean;
  created_at?: string;
  updated_at?: string;

  triggerType?: string;
  conditionJson?: string;
  actionJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

function encodeAutomationTextToBackendJson(value: string): unknown {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function decodeAutomationBytesToText(inputBase64: string): string {
  const decoded = inputBase64 ? base64DecodeToUtf8(inputBase64) : "";
  if (!decoded) return "";

  function maybeDecodeLegacyBase64(value: string): string {
    const trimmedValue = value.trim();
    const looksBase64 =
      /^[A-Za-z0-9+/]+={0,2}$/.test(trimmedValue) &&
      trimmedValue.length % 4 === 0;
    if (!looksBase64) return value;

    try {
      const legacyDecoded = base64DecodeToUtf8(trimmedValue);
      if (!legacyDecoded) return value;

      const printableCount = legacyDecoded
        .split("")
        .filter(
          (c) =>
            c === "\n" || c === "\r" || c === "\t" || (c >= " " && c <= "~"),
        ).length;
      const printableRatio = printableCount / Math.max(legacyDecoded.length, 1);
      if (printableRatio > 0.85) return legacyDecoded;
    } catch {
      // ignore
    }

    return value;
  }

  // Backend stores []byte. Depending on how it was written, decoded payload
  // may be a JSON string ("...") or a JSON object/array, or plain text.
  const trimmed = decoded.trim();
  const looksJson =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[");

  if (!looksJson) return decoded;

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") return maybeDecodeLegacyBase64(parsed);
    return JSON.stringify(parsed);
  } catch {
    return decoded;
  }
}

function mapAutomation(r: BackendAutomationRule): AutomationRule {
  return {
    id: r.id,
    name: r.name,
    trigger: r.triggerType ?? r.trigger_type ?? "",
    condition: decodeAutomationBytesToText(
      r.conditionJson ?? r.condition_json ?? "",
    ),
    action: decodeAutomationBytesToText(r.actionJson ?? r.action_json ?? ""),
    enabled: r.enabled,
    createdAt: r.createdAt ?? r.created_at ?? "",
    updatedAt: r.updatedAt ?? r.updated_at ?? "",
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
        // Backend expects JSON. If the user pasted JSON text, send it as JSON;
        // otherwise preserve as a plain string for backwards compatibility.
        condition_json: encodeAutomationTextToBackendJson(
          request.condition ?? "",
        ),
        action_json: encodeAutomationTextToBackendJson(request.action ?? ""),
        enabled: request.enabled,
      },
    );
    return mapAutomation(backend);
  },

  async updateAutomation(
    id: string,
    request: AutomationUpdateRequest,
  ): Promise<AutomationRule> {
    const payload: Record<string, unknown> = {};
    if (request.name !== undefined) payload.name = request.name;
    if (request.trigger !== undefined) payload.trigger_type = request.trigger;
    if (request.condition !== undefined)
      payload.condition_json = encodeAutomationTextToBackendJson(
        request.condition,
      );
    if (request.action !== undefined)
      payload.action_json = encodeAutomationTextToBackendJson(request.action);
    if (request.enabled !== undefined) payload.enabled = request.enabled;

    const backend = await apiClient.put<BackendAutomationRule>(
      API_ENDPOINTS.AUTOMATION(id),
      payload,
    );
    return mapAutomation(backend);
  },

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    await apiClient.put<void>(API_ENDPOINTS.AUTOMATION(id), {
      enabled,
    });
  },

  async deleteAutomation(id: string): Promise<void> {
    await apiClient.delete<void>(API_ENDPOINTS.AUTOMATION(id));
  },
};
