import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  integrationsService,
  type WhatsAppUpsertPayload,
} from "@/src/services/integrations-service";
import { QUERY_KEYS } from "@/lib/constants";

export function useIntegrationsStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.INTEGRATIONS_STATUS,
    queryFn: () => integrationsService.getStatus(),
    staleTime: 10 * 1000,
  });
}

export function useDisconnectGoogle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => integrationsService.disconnectGoogle(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INTEGRATIONS_STATUS });
    },
  });
}

export function useUpsertWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WhatsAppUpsertPayload) =>
      integrationsService.upsertWhatsApp(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INTEGRATIONS_STATUS });
    },
  });
}

export function useDisconnectWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => integrationsService.disconnectWhatsApp(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INTEGRATIONS_STATUS });
    },
  });
}
