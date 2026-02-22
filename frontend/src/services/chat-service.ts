import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import type {
  ChatRequest,
  ChatResponse,
  VoiceRequest,
  VoiceTranscriptionResponse,
} from "@/types";
import { base64DecodeToUtf8 } from "@/lib/base64";

type BackendChatResponse = {
  reply: string;
  intent?: string;
  requires_approval?: boolean;
  approval_id?: string;
  tools_used?: string; // base64-encoded JSON ([]byte)
  latency_ms?: number;

  requiresApproval?: boolean;
  approvalId?: string;
  toolsUsed?: string;
  latencyMs?: number;
};

export const chatService = {
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const backend = await apiClient.post<BackendChatResponse>(
      API_ENDPOINTS.CHAT,
      {
        session_id: request.sessionId,
        message: request.message,
      },
    );

    let toolsUsed: string[] | undefined;
    const toolsUsedBase64 = backend.toolsUsed ?? backend.tools_used;
    if (toolsUsedBase64) {
      try {
        toolsUsed = JSON.parse(base64DecodeToUtf8(toolsUsedBase64)) as string[];
      } catch {
        toolsUsed = undefined;
      }
    }

    return {
      id: `msg-${Date.now()}`,
      sessionId: request.sessionId,
      message: backend.reply,
      intent: backend.intent,
      toolsUsed,
      latency: backend.latencyMs ?? backend.latency_ms ?? 0,
      requiresApproval: Boolean(
        backend.requiresApproval ?? backend.requires_approval,
      ),
      approvalId: backend.approvalId ?? backend.approval_id,
    };
  },

  async sendVoice(request: VoiceRequest): Promise<VoiceTranscriptionResponse> {
    const formData = new FormData();
    // Backend expects multipart field name: file
    // The Python agent validates file extension; provide a supported filename.
    formData.append("file", request.file, "audio.webm");

    const backend = await apiClient.request<{
      transcription: string;
      latency_ms?: number;
      latencyMs?: number;
    }>(API_ENDPOINTS.VOICE, {
      method: "POST",
      body: formData,
    });

    return {
      transcription: backend.transcription,
      latencyMs: backend.latencyMs ?? backend.latency_ms,
    };
  },
};
