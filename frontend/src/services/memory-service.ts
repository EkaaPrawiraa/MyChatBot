import apiClient from "./api-client";
import { API_ENDPOINTS, DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { LongTermMemory, MemorySearchResponse } from "@/types";

export interface MemorySearchParams {
  query: string;
  limit?: number;
}

type BackendLongTermMemory = {
  id: string;
  content: string;
  category: string;
  metadata?: unknown;
  created_at: string;
};

function mapMemory(m: BackendLongTermMemory): LongTermMemory {
  return {
    id: m.id,
    content: m.content,
    category: m.category,
    createdAt: m.created_at,
    updatedAt: m.created_at,
  };
}

export const memoryService = {
  async searchMemory(
    params: MemorySearchParams,
  ): Promise<MemorySearchResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set("q", params.query);
    searchParams.set("limit", String(params.limit || DEFAULT_PAGE_SIZE));

    const endpoint = `${API_ENDPOINTS.MEMORY_SEARCH}?${searchParams.toString()}`;
    const backend = await apiClient.get<BackendLongTermMemory[]>(endpoint);
    const memories = (backend || []).map(mapMemory);
    return {
      memories,
      total: memories.length,
    };
  },

  async getRecentMemory(limit?: number): Promise<LongTermMemory[]> {
    const searchParams = new URLSearchParams();
    searchParams.set("limit", String(limit || DEFAULT_PAGE_SIZE));

    const endpoint = `${API_ENDPOINTS.MEMORY_RECENT}?${searchParams.toString()}`;
    const backend = await apiClient.get<BackendLongTermMemory[]>(endpoint);
    return (backend || []).map(mapMemory);
  },
};
