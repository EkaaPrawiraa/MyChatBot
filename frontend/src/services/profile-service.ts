import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import type { UserProfile } from "@/types";

export interface ProfileUpdateRequest {
  name?: string;
  email?: string;
  meetingHours?: string;
  focusHours?: string;
  communicationStyle?: string;
  workPattern?: string;
  aiProvider?: "openai" | "anthropic" | "xai";
  aiApiKey?: string;
  aiModel?: string;
  aiSkill?: "quick" | "balanced" | "deep";
  sidebarMenus?: Record<string, boolean>;
  whatsappRequiresApproval?: boolean;
}

type BackendProfileResponse = {
  id: number;
  name: string;
  email: string;
  preferred_meeting_hours: string;
  focus_hours: string;
  communication_style: string;
  work_pattern: string;
  ai_provider: "openai" | "anthropic" | "xai";
  ai_model: string;
  ai_skill?: "quick" | "balanced" | "deep";
  sidebar_menus?: Record<string, boolean>;
  whatsapp_requires_approval?: boolean;
  ai_api_key_masked?: string;
  created_at: string;
  updated_at: string;
};

function mapProfile(p: BackendProfileResponse): UserProfile {
  return {
    id: String(p.id),
    name: p.name,
    email: p.email,
    meetingHours: p.preferred_meeting_hours,
    focusHours: p.focus_hours,
    communicationStyle: p.communication_style,
    workPattern: p.work_pattern,
    aiProvider: p.ai_provider,
    aiModel: p.ai_model,
    aiSkill: p.ai_skill,
    sidebarMenus: p.sidebar_menus,
    whatsappRequiresApproval: p.whatsapp_requires_approval,
    aiApiKeyMasked: p.ai_api_key_masked,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export const profileService = {
  async getProfile(): Promise<UserProfile> {
    const backend = await apiClient.get<BackendProfileResponse>(
      API_ENDPOINTS.PROFILE,
    );
    return mapProfile(backend);
  },

  async updateProfile(request: ProfileUpdateRequest): Promise<UserProfile> {
    const backend = await apiClient.put<BackendProfileResponse>(
      API_ENDPOINTS.PROFILE,
      {
        name: request.name,
        email: request.email,
        preferred_meeting_hours: request.meetingHours,
        focus_hours: request.focusHours,
        communication_style: request.communicationStyle,
        work_pattern: request.workPattern,
        ai_provider: request.aiProvider,
        ai_api_key: request.aiApiKey,
        ai_model: request.aiModel,
        ai_skill: request.aiSkill,
        sidebar_menus: request.sidebarMenus,
        whatsapp_requires_approval: request.whatsappRequiresApproval,
      },
    );
    return mapProfile(backend);
  },
};
