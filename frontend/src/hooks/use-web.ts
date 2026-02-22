import { useMutation } from "@tanstack/react-query";
import { webService } from "@/src/services/web-service";

export function useWebSearch() {
  return useMutation({
    mutationFn: (params: { query: string; maxResults?: number }) =>
      webService.search(params),
  });
}

export function useWebFetch() {
  return useMutation({
    mutationFn: (params: { url: string; maxBytes?: number }) =>
      webService.fetch(params),
  });
}
