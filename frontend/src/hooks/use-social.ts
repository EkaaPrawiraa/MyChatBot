import { useMutation } from "@tanstack/react-query";
import {
  socialService,
  type DiscordWebhookSendPayload,
  type TelegramSendPayload,
} from "@/src/services/social-service";

export function useTelegramSend() {
  return useMutation({
    mutationFn: (payload: TelegramSendPayload) =>
      socialService.telegramSend(payload),
  });
}

export function useTelegramUpdates() {
  return useMutation({
    mutationFn: (params: {
      offset?: number;
      limit?: number;
      timeout?: number;
    }) => socialService.telegramUpdates(params),
  });
}

export function useDiscordWebhookSend() {
  return useMutation({
    mutationFn: (payload: DiscordWebhookSendPayload) =>
      socialService.discordWebhookSend(payload),
  });
}
