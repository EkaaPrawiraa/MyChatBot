import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";

export type GmailMessageHeader = {
  name: string;
  value: string;
};

export type GmailMessage = {
  id: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers?: GmailMessageHeader[];
  };
  internalDate?: string;
};

export type GmailSearchResult = {
  query: string;
  count: number;
  messages: GmailMessage[];
};

export type GmailCategorizedUnreadResult = {
  categories: Record<string, GmailSearchResult>;
};

export const gmailService = {
  async unread(maxResults: number = 50): Promise<{ unread: number }> {
    const qs = new URLSearchParams({ maxResults: String(maxResults) });
    return apiClient.get<{ unread: number }>(
      `${API_ENDPOINTS.GMAIL_UNREAD}?${qs.toString()}`,
    );
  },

  async search(
    query: string,
    maxResults: number = 10,
  ): Promise<GmailSearchResult> {
    const qs = new URLSearchParams({
      q: query,
      maxResults: String(maxResults),
    });
    return apiClient.get<GmailSearchResult>(
      `${API_ENDPOINTS.GMAIL_SEARCH}?${qs.toString()}`,
    );
  },

  async categorizedUnread(
    maxResults: number = 10,
  ): Promise<GmailCategorizedUnreadResult> {
    const qs = new URLSearchParams({ maxResults: String(maxResults) });
    return apiClient.get<GmailCategorizedUnreadResult>(
      `${API_ENDPOINTS.GMAIL_CATEGORIZED_UNREAD}?${qs.toString()}`,
    );
  },

  async send(payload: {
    to: string;
    subject?: string;
    body?: string;
  }): Promise<unknown> {
    return apiClient.post(API_ENDPOINTS.GMAIL_SEND, {
      to: payload.to,
      subject: payload.subject || "",
      body: payload.body || "",
    });
  },
};
