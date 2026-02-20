import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import type { Message, Session } from "@/types";

export interface SessionCreateRequest {
  title?: string;
}

type BackendSession = {
  id: string;
  title: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type BackendShortTermMessage = {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  message: string;
  created_at: string;
};

function mapSession(s: BackendSession): Session {
  return {
    id: s.id,
    title: s.title,
    startTime: s.created_at,
    endTime: undefined,
    closed: !s.active,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

export const sessionService = {
  async createSession(request?: SessionCreateRequest): Promise<Session> {
    const backend = await apiClient.post<BackendSession>(
      API_ENDPOINTS.SESSIONS,
      {
        title:
          request?.title || `Chat ${new Date().toISOString().split("T")[0]}`,
      },
    );
    return mapSession(backend);
  },

  async getSessions(): Promise<Session[]> {
    const backend = await apiClient.get<BackendSession[]>(
      API_ENDPOINTS.SESSIONS,
    );
    return (backend || []).map(mapSession);
  },

  async getSession(id: string): Promise<Session> {
    const backend = await apiClient.get<BackendSession>(
      API_ENDPOINTS.SESSION(id),
    );
    return mapSession(backend);
  },

  async closeSession(id: string): Promise<void> {
    await apiClient.post<void>(API_ENDPOINTS.CLOSE_SESSION(id), {});
  },

  async deleteSession(id: string): Promise<void> {
    // Backend returns 204 No Content.
    await apiClient.delete<unknown>(API_ENDPOINTS.SESSION(id));
  },

  async getSessionMessages(
    id: string,
    limit: number = 200,
  ): Promise<Message[]> {
    const backend = await apiClient.get<BackendShortTermMessage[]>(
      API_ENDPOINTS.SESSION_MESSAGES(id) + `?limit=${limit}`,
    );

    return (backend || [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        id: m.id,
        sessionId: m.session_id,
        role: m.role,
        content: m.message,
        createdAt: m.created_at,
      }));
  },
};
