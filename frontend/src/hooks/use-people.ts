import { useMutation } from "@tanstack/react-query";
import { peopleService } from "@/src/services/people-service";

export function usePeopleSearch() {
  return useMutation({
    mutationFn: (params: {
      query: string;
      pageSize?: number;
      pageToken?: string;
    }) => peopleService.search(params),
  });
}
