import apiClient from "@/src/services/api-client";
import { API_ENDPOINTS } from "@/src/lib/constants";

export const xService = {
  async me() {
    return apiClient.get(API_ENDPOINTS.X_ME);
  },

  async myTweets(params: { limit?: number }) {
    const qs = new URLSearchParams();
    if (params.limit && params.limit > 0) qs.set("limit", String(params.limit));

    const suffix = qs.toString();
    return apiClient.get(
      suffix
        ? `${API_ENDPOINTS.X_MY_TWEETS}?${suffix}`
        : API_ENDPOINTS.X_MY_TWEETS,
    );
  },

  async createTweet(payload: { text: string }) {
    return apiClient.post(API_ENDPOINTS.X_TWEET_CREATE, payload);
  },

  async search(params: { query: string; maxResults?: number }) {
    const qs = new URLSearchParams();
    if (params.query?.trim()) qs.set("q", params.query.trim());
    if (params.maxResults && params.maxResults > 0) {
      qs.set("maxResults", String(params.maxResults));
    }

    const suffix = qs.toString();
    return apiClient.get(
      suffix ? `${API_ENDPOINTS.X_SEARCH}?${suffix}` : API_ENDPOINTS.X_SEARCH,
    );
  },
};
