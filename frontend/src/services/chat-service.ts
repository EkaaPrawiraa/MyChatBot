import apiClient from './api-client'
import { API_ENDPOINTS } from '@/lib/constants'
import type { ChatRequest, ChatResponse, VoiceRequest, VoiceTranscriptionResponse } from '@/types'

export const chatService = {
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    return apiClient.post<ChatResponse>(API_ENDPOINTS.CHAT, {
      session_id: request.sessionId,
      message: request.message,
    })
  },

  async sendVoice(request: VoiceRequest): Promise<VoiceTranscriptionResponse> {
    const formData = new FormData()
    formData.append('session_id', request.sessionId)
    formData.append('audio', request.audio)

    return apiClient.request<VoiceTranscriptionResponse>(API_ENDPOINTS.VOICE, {
      method: 'POST',
      body: formData,
      headers: {}, // FormData sets its own Content-Type
    })
  },
}
