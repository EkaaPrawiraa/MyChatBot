// Prefer same-origin requests so Next.js can rewrite/proxy to the Go backend.
// Set NEXT_PUBLIC_API_URL to override (e.g. when deploying frontend separately).
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// LocalStorage key used by the dashboard to persist the backend auth key.
export const DASHBOARD_API_KEY_STORAGE_KEY = "axis_dashboard_api_key";

export const API_ENDPOINTS = {
  // Chat
  CHAT: "/api/v1/chat",
  VOICE: "/api/v1/voice",

  // Sessions
  SESSIONS: "/api/v1/sessions",
  SESSION: (id: string) => `/api/v1/sessions/${id}`,
  SESSION_MESSAGES: (id: string) => `/api/v1/sessions/${id}/messages`,
  CLOSE_SESSION: (id: string) => `/api/v1/sessions/${id}/close`,

  // Profile
  PROFILE: "/api/v1/profile",

  // Models
  MODELS: "/api/v1/models",

  // Activities
  ACTIVITIES: "/api/v1/activities",

  // Memory
  MEMORY_SEARCH: "/api/v1/memory/search",
  MEMORY_RECENT: "/api/v1/memory/recent",

  // Automations
  AUTOMATIONS: "/api/v1/automations",
  AUTOMATION: (id: string) => `/api/v1/automations/${id}`,

  // Reminders
  REMINDERS: "/api/v1/reminders",
  REMINDER: (id: string) => `/api/v1/reminders/${id}`,

  // Integrations
  INTEGRATIONS_STATUS: "/api/v1/integrations/status",
  GOOGLE_CONNECT: "/api/v1/integrations/google/connect",
  GOOGLE_DISCONNECT: "/api/v1/integrations/google/disconnect",
  WHATSAPP_UPSERT: "/api/v1/integrations/whatsapp",
  WHATSAPP_DISCONNECT: "/api/v1/integrations/whatsapp/disconnect",

  // WhatsApp
  WHATSAPP_SEND: "/api/v1/whatsapp/send",
  WHATSAPP_STATUS: "/api/v1/whatsapp/status",
  WHATSAPP_QR_PNG: "/api/v1/whatsapp/qr.png",
  WHATSAPP_LOGOUT: "/api/v1/whatsapp/logout",

  // Calendar
  CALENDAR_EVENTS: "/api/v1/calendar/events",
  CALENDAR_FREEBUSY: "/api/v1/calendar/freebusy",

  // Gmail
  GMAIL_UNREAD: "/api/v1/gmail/unread",
  GMAIL_SEARCH: "/api/v1/gmail/search",
  GMAIL_CATEGORIZED_UNREAD: "/api/v1/gmail/categorized-unread",
  GMAIL_SEND: "/api/v1/gmail/send",

  // Google People / Drive / YouTube
  PEOPLE_SEARCH: "/api/v1/people/search",
  DRIVE_SEARCH: "/api/v1/drive/search",
  YOUTUBE_ANALYTICS: "/api/v1/youtube/analytics",
};

export const API_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_QUERY_TIMEOUT = 30000;

// Navigation
export const NAVIGATION_ITEMS = [
  { label: "Chat", href: "/chat", icon: "MessageSquare" },
  { label: "Activities", href: "/activities", icon: "Activity" },
  { label: "Memory", href: "/memory", icon: "Brain" },
  { label: "Automations", href: "/automations", icon: "Zap" },
  { label: "Settings", href: "/settings", icon: "Settings" },
];

// Cache Keys for React Query
export const QUERY_KEYS = {
  SESSIONS: ["sessions"],
  SESSION: (id: string) => ["session", id],
  SESSION_MESSAGES: (id: string) => ["session", id, "messages"],
  PROFILE: ["profile"],
  MODELS: ["models"],
  ACTIVITIES: ["activities"],
  ACTIVITY: (id: string) => ["activity", id],
  MEMORY_SEARCH: (query: string) => ["memory", "search", query],
  MEMORY_RECENT: ["memory", "recent"],
  AUTOMATIONS: ["automations"],
  AUTOMATION: (id: string) => ["automation", id],
  REMINDERS: ["reminders"],
  REMINDER: (id: string) => ["reminder", id],
  INTEGRATIONS_STATUS: ["integrations", "status"],

  GMAIL_UNREAD: (maxResults: number) => ["gmail", "unread", maxResults],
  GMAIL_CATEGORIZED_UNREAD: (maxResults: number) => [
    "gmail",
    "categorized",
    maxResults,
  ],

  CALENDAR_EVENTS: (timeMin: string, timeMax: string, maxResults: number) => [
    "calendar",
    "events",
    timeMin,
    timeMax,
    maxResults,
  ],
};

// UI Constants
export const SIDEBAR_WIDTH = 280;
export const MOBILE_BREAKPOINT = 768;

// Animations
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
};

// Default values
export const DEFAULT_COMMUNICATION_STYLE = "professional";
export const DEFAULT_WORK_PATTERN = "9am-5pm";

// Markdown configuration
export const MARKDOWN_OPTIONS = {
  breaks: true,
  gfm: true,
};

// Toast messages
export const TOAST_MESSAGES = {
  PROFILE_UPDATED: "Profile updated successfully",
  AUTOMATION_CREATED: "Automation created successfully",
  AUTOMATION_UPDATED: "Automation updated successfully",
  AUTOMATION_DELETED: "Automation deleted successfully",
  SESSION_CLOSED: "Session closed successfully",
  ERROR_GENERIC: "An error occurred. Please try again.",
  COPY_TO_CLIPBOARD: "Copied to clipboard",
};

// Validation patterns
export const VALIDATION = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
};
