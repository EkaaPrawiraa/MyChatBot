import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  htmlLink?: string;
  location?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
};

type GoogleCalendarEventsList = {
  items?: GoogleCalendarEvent[];
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  link?: string;
  location?: string;
  allDay?: boolean;
};

function mapEvent(e: GoogleCalendarEvent): CalendarEvent {
  const start = e.start?.dateTime || e.start?.date || "";
  const end = e.end?.dateTime || e.end?.date;
  const allDay = !!e.start?.date && !e.start?.dateTime;

  return {
    id: e.id,
    title: e.summary || "(No title)",
    start,
    end,
    link: e.htmlLink,
    location: e.location,
    allDay,
  };
}

export const calendarService = {
  async listEvents(params: {
    timeMin: string;
    timeMax: string;
    maxResults?: number;
  }): Promise<CalendarEvent[]> {
    const maxResults = params.maxResults ?? 20;
    const qs = new URLSearchParams({
      timeMin: params.timeMin,
      timeMax: params.timeMax,
      maxResults: String(maxResults),
    });

    const backend = await apiClient.get<GoogleCalendarEventsList>(
      `${API_ENDPOINTS.CALENDAR_EVENTS}?${qs.toString()}`,
    );

    return (backend?.items || []).map(mapEvent);
  },

  async createEvent(payload: {
    summary: string;
    start: string;
    end: string;
    description?: string;
    location?: string;
    create_meet?: boolean;
  }): Promise<any> {
    return apiClient.post(API_ENDPOINTS.CALENDAR_EVENTS, payload);
  },

  async updateEvent(
    eventId: string,
    payload: {
      summary?: string;
      start?: string;
      end?: string;
      description?: string;
      location?: string;
    },
  ): Promise<any> {
    return apiClient.put(
      `${API_ENDPOINTS.CALENDAR_EVENTS}/${eventId}`,
      payload,
    );
  },

  async deleteEvent(eventId: string): Promise<any> {
    return apiClient.delete(`${API_ENDPOINTS.CALENDAR_EVENTS}/${eventId}`);
  },
};
