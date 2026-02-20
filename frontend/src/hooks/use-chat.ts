import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chatService } from "@/src/services/chat-service";
import { QUERY_KEYS } from "@/lib/constants";
import type {
  ChatRequest,
  ChatResponse,
  VoiceRequest,
  VoiceTranscriptionResponse,
} from "@/types";

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ChatRequest) => chatService.sendMessage(request),
    onSuccess: (data) => {
      // Invalidate sessions to refresh with new messages
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SESSIONS });

      // Also refresh the active session's message history.
      if (data?.sessionId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.SESSION_MESSAGES(data.sessionId),
        });
      }
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
    },
  });
}

export function useVoiceTranscribe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: VoiceRequest) => chatService.sendVoice(request),
    onSuccess: () => {
      // Invalidate sessions after voice processing
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SESSIONS });
    },
    onError: (error) => {
      console.error("Failed to transcribe voice:", error);
    },
  });
}
