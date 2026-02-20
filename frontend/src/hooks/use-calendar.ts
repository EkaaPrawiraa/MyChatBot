import { useQuery } from "@tanstack/react-query";
import { calendarService } from "@/src/services/calendar-service";
import { QUERY_KEYS } from "@/lib/constants";

export function useCalendarEvents(params: {
  timeMin: string;
  timeMax: string;
  maxResults?: number;
}) {
  const maxResults = params.maxResults ?? 20;

  return useQuery({
    queryKey: QUERY_KEYS.CALENDAR_EVENTS(
      params.timeMin,
      params.timeMax,
      maxResults,
    ),
    queryFn: () =>
      calendarService.listEvents({
        timeMin: params.timeMin,
        timeMax: params.timeMax,
        maxResults,
      }),
    staleTime: 30 * 1000,
  });
}
