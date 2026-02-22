import apiClient from "@/src/services/api-client";
import { API_ENDPOINTS } from "@/lib/constants";

export interface IntegrationsStatus {
  google: {
    connected: boolean;
    email?: string;
  };
  whatsapp: {
    configured: boolean;
    phoneNumberId?: string;
    businessAccountId?: string;
    apiTokenMasked?: string;
  };
  telegram?: {
    configured: boolean;
    botTokenMasked?: string;
  };
  discord?: {
    configured: boolean;
    webhookMasked?: string;
    botTokenMasked?: string;
  };

  x?: {
    configured: boolean;
    apiKeyMasked?: string;
    accessTokenMasked?: string;
    bearerTokenMasked?: string;
    oauth2AccessTokenMasked?: string;
  };
}

export interface WhatsAppUpsertPayload {
  phone_number_id: string;
  business_account_id?: string;
  api_token: string;
}

export interface TelegramUpsertPayload {
  bot_token: string;
}

export interface DiscordUpsertPayload {
  webhook_url?: string;
  bot_token?: string;
}

export interface XUpsertPayload {
  api_key?: string;
  api_secret?: string;
  access_token?: string;
  access_token_secret?: string;
  bearer_token?: string;
}

export const integrationsService = {
  async getStatus(): Promise<IntegrationsStatus> {
    return apiClient.get<IntegrationsStatus>(API_ENDPOINTS.INTEGRATIONS_STATUS);
  },

  async disconnectGoogle(): Promise<{ disconnected: boolean }> {
    return apiClient.post<{ disconnected: boolean }>(
      API_ENDPOINTS.GOOGLE_DISCONNECT,
    );
  },

  async upsertWhatsApp(
    payload: WhatsAppUpsertPayload,
  ): Promise<IntegrationsStatus> {
    return apiClient.put<IntegrationsStatus>(
      API_ENDPOINTS.WHATSAPP_UPSERT,
      payload,
    );
  },

  async disconnectWhatsApp(): Promise<{ disconnected: boolean }> {
    return apiClient.post<{ disconnected: boolean }>(
      API_ENDPOINTS.WHATSAPP_DISCONNECT,
    );
  },

  async upsertTelegram(
    payload: TelegramUpsertPayload,
  ): Promise<IntegrationsStatus> {
    return apiClient.put<IntegrationsStatus>(
      API_ENDPOINTS.TELEGRAM_UPSERT,
      payload,
    );
  },

  async disconnectTelegram(): Promise<{ disconnected: boolean }> {
    return apiClient.post<{ disconnected: boolean }>(
      API_ENDPOINTS.TELEGRAM_DISCONNECT,
    );
  },

  async upsertDiscord(
    payload: DiscordUpsertPayload,
  ): Promise<IntegrationsStatus> {
    return apiClient.put<IntegrationsStatus>(
      API_ENDPOINTS.DISCORD_UPSERT,
      payload,
    );
  },

  async disconnectDiscord(): Promise<{ disconnected: boolean }> {
    return apiClient.post<{ disconnected: boolean }>(
      API_ENDPOINTS.DISCORD_DISCONNECT,
    );
  },

  async upsertX(payload: XUpsertPayload): Promise<IntegrationsStatus> {
    return apiClient.put<IntegrationsStatus>(API_ENDPOINTS.X_UPSERT, payload);
  },

  async disconnectX(): Promise<{ disconnected: boolean }> {
    return apiClient.post<{ disconnected: boolean }>(
      API_ENDPOINTS.X_DISCONNECT,
    );
  },
};
