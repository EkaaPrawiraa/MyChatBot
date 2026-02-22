import apiClient from "@/src/services/api-client";
import { API_ENDPOINTS } from "@/lib/constants";

export interface WhatsAppWebStatus {
  connected: boolean;
  me?: {
    id?: string;
    name?: string;
  } | null;
  // Prefer camelCase (apiClient camelizes responses), but keep snake_case
  // as optional for backwards compatibility.
  qrAvailable?: boolean;
  qrUpdatedAt?: string | null;
  qr_available?: boolean;
  qr_updated_at?: string | null;
}

export const whatsappWebService = {
  async getStatus(): Promise<WhatsAppWebStatus> {
    return apiClient.get<WhatsAppWebStatus>(API_ENDPOINTS.WHATSAPP_STATUS);
  },

  async logout(): Promise<{ ok: boolean } | unknown> {
    return apiClient.post(API_ENDPOINTS.WHATSAPP_LOGOUT);
  },

  // QR image is retrieved via <img src={API_ENDPOINTS.WHATSAPP_QR_PNG} />
};
