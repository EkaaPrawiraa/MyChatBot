import { useMutation } from "@tanstack/react-query";
import {
  youtubeService,
  type YouTubeAnalyticsParams,
} from "@/src/services/youtube-service";

export function useYouTubeAnalytics() {
  return useMutation({
    mutationFn: (params: YouTubeAnalyticsParams) =>
      youtubeService.analytics(params),
  });
}
