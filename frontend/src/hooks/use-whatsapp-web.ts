import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { whatsappWebService } from "@/src/services/whatsapp-web-service";

const WHATSAPP_WEB_STATUS_KEY = ["whatsapp", "web", "status"] as const;

export function useWhatsAppWebStatus(enabled: boolean = true) {
  return useQuery({
    queryKey: WHATSAPP_WEB_STATUS_KEY,
    queryFn: () => whatsappWebService.getStatus(),
    enabled,
    staleTime: 1000,
    refetchInterval: 2000,
  });
}

export function useWhatsAppWebLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => whatsappWebService.logout(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WHATSAPP_WEB_STATUS_KEY });
    },
  });
}
