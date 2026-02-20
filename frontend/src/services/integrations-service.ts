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
}

export interface WhatsAppUpsertPayload {
  phone_number_id: string;
  business_account_id?: string;
  api_token: string;
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
};
