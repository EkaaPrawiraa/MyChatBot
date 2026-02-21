import apiClient from "@/src/services/api-client";
import { API_ENDPOINTS } from "@/src/lib/constants";

export interface TelegramSendPayload {
  chat_id: string;
  message: string;
}

export interface DiscordWebhookSendPayload {
  content: string;
  username?: string;
}

export const socialService = {
  async telegramSend(payload: TelegramSendPayload) {
    return apiClient.post(API_ENDPOINTS.TELEGRAM_SEND, payload);
  },

  async telegramUpdates(params: {
    offset?: number;
    limit?: number;
    timeout?: number;
  }) {
    const qs = new URLSearchParams();
    if (params.offset && params.offset > 0)
      qs.set("offset", String(params.offset));
    if (params.limit && params.limit > 0) qs.set("limit", String(params.limit));
    if (params.timeout && params.timeout > 0)
      qs.set("timeout", String(params.timeout));

    const suffix = qs.toString();
    return apiClient.get(
      suffix
        ? `${API_ENDPOINTS.TELEGRAM_UPDATES}?${suffix}`
        : API_ENDPOINTS.TELEGRAM_UPDATES,
    );
  },

  async discordWebhookSend(payload: DiscordWebhookSendPayload) {
    return apiClient.post(API_ENDPOINTS.DISCORD_WEBHOOK_SEND, payload);
  },
};
