import { useMutation } from "@tanstack/react-query";
import { xService } from "@/src/services/x-service";

export function useXMe() {
  return useMutation({
    mutationFn: () => xService.me(),
  });
}

export function useXMyTweets() {
  return useMutation({
    mutationFn: (params: { limit?: number }) => xService.myTweets(params),
  });
}

export function useXCreateTweet() {
  return useMutation({
    mutationFn: (payload: { text: string }) => xService.createTweet(payload),
  });
}

export function useXSearch() {
  return useMutation({
    mutationFn: (params: { query: string; maxResults?: number }) =>
      xService.search(params),
  });
}
