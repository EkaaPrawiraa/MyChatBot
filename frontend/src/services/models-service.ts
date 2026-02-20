import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import type { Model } from "@/types";

export const modelsService = {
  async getModels(): Promise<Model[]> {
    const response = await apiClient.get<{
      providers: Record<string, string[]>;
    }>(API_ENDPOINTS.MODELS);
    const providers = response.providers || {};

    const models: Model[] = [];
    for (const [provider, ids] of Object.entries(providers)) {
      for (const id of ids) {
        models.push({
          id,
          name: id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          provider: provider as any,
          contextWindow: 0,
          costPer1kTokens: 0,
        });
      }
    }
    return models;
  },
};
