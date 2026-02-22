import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";

export type DocumentsSummarizeResponse = {
  summary: string;
  latencyMs?: number;
  latency_ms?: number;
};

export const documentsService = {
  async summarize(params: {
    title?: string;
    kind?: string;
    content: string;
    maxWords?: number;
  }): Promise<DocumentsSummarizeResponse> {
    return apiClient.post<DocumentsSummarizeResponse>(
      API_ENDPOINTS.DOCUMENTS_SUMMARIZE,
      {
        title: params.title || "",
        kind: params.kind || "",
        content: params.content,
        max_words: params.maxWords || 0,
      },
    );
  },
};
