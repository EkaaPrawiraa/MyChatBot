import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";

export type WebSearchResponse = {
  query?: string;
  results?: Array<{
    title?: string;
    url?: string;
    snippet?: string;
    content?: string;
  }>;
  source?: string;
  warnings?: string[];
};

export type WebFetchResponse = {
  url?: string;
  contentType?: string;
  text?: string;
  truncated?: boolean;
};

export const webService = {
  async search(params: {
    query: string;
    maxResults?: number;
  }): Promise<WebSearchResponse> {
    const qs = new URLSearchParams();
    qs.set("q", params.query);
    if (params.maxResults !== undefined) {
      qs.set("maxResults", String(params.maxResults));
    }

    return apiClient.get<WebSearchResponse>(
      `${API_ENDPOINTS.WEB_SEARCH}?${qs.toString()}`,
    );
  },

  async fetch(params: { url: string }): Promise<WebFetchResponse> {
    const qs = new URLSearchParams();
    qs.set("url", params.url);

    return apiClient.get<WebFetchResponse>(
      `${API_ENDPOINTS.WEB_FETCH}?${qs.toString()}`,
    );
  },
};
