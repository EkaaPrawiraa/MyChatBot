import { useMutation } from "@tanstack/react-query";
import { documentsService } from "@/src/services/documents-service";

export function useDocumentsSummarize() {
  return useMutation({
    mutationFn: (params: {
      title?: string;
      kind?: string;
      content: string;
      maxWords?: number;
    }) => documentsService.summarize(params),
  });
}
