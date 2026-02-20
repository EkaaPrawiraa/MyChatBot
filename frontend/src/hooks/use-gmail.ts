import { useMutation, useQuery } from "@tanstack/react-query";
import { gmailService } from "@/src/services/gmail-service";
import { QUERY_KEYS } from "@/lib/constants";

export function useGmailUnread(maxResults: number = 50) {
  return useQuery({
    queryKey: QUERY_KEYS.GMAIL_UNREAD(maxResults),
    queryFn: () => gmailService.unread(maxResults),
    staleTime: 10 * 1000,
  });
}

export function useGmailCategorizedUnread(maxResults: number = 10) {
  return useQuery({
    queryKey: QUERY_KEYS.GMAIL_CATEGORIZED_UNREAD(maxResults),
    queryFn: () => gmailService.categorizedUnread(maxResults),
    staleTime: 10 * 1000,
  });
}

export function useGmailSearch() {
  return useMutation({
    mutationFn: (params: { query: string; maxResults?: number }) =>
      gmailService.search(params.query, params.maxResults ?? 10),
  });
}

export function useGmailSend() {
  return useMutation({
    mutationFn: (payload: { to: string; subject?: string; body?: string }) =>
      gmailService.send(payload),
  });
}
