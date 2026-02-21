import { API_ENDPOINTS } from "@/lib/constants";
import apiClient from "@/src/services/api-client";

export type YouTubeAnalyticsParams = {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};

export type YouTubeAnalyticsResponse = {
  startDate: string;
  endDate: string;
  channels?: any;
  report?: any;
};

export const youtubeService = {
  analytics(params: YouTubeAnalyticsParams): Promise<YouTubeAnalyticsResponse> {
    const q = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
    });
    return apiClient.get<YouTubeAnalyticsResponse>(
      `${API_ENDPOINTS.YOUTUBE_ANALYTICS}?${q.toString()}`,
    );
  },
};
