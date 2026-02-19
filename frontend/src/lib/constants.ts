export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const API_ENDPOINTS = {
  // Chat
  CHAT: '/api/v1/chat',
  VOICE: '/api/v1/voice',

  // Sessions
  SESSIONS: '/api/v1/sessions',
  SESSION: (id: string) => `/api/v1/sessions/${id}`,
  CLOSE_SESSION: (id: string) => `/api/v1/sessions/${id}/close`,

  // Profile
  PROFILE: '/api/v1/profile',

  // Models
  MODELS: '/api/v1/models',

  // Activities
  ACTIVITIES: '/api/v1/activities',

  // Memory
  MEMORY_SEARCH: '/api/v1/memory/search',
  MEMORY_RECENT: '/api/v1/memory/recent',

  // Approvals
  APPROVALS: '/api/v1/approvals',
  APPROVAL: (id: string) => `/api/v1/approvals/${id}`,
  APPROVE: (id: string) => `/api/v1/approvals/${id}/approve`,
  REJECT: (id: string) => `/api/v1/approvals/${id}/reject`,

  // Automations
  AUTOMATIONS: '/api/v1/automations',
  AUTOMATION: (id: string) => `/api/v1/automations/${id}`,

  // Reminders
  REMINDERS: '/api/v1/reminders',
  REMINDER: (id: string) => `/api/v1/reminders/${id}`,
}

export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
}

export const DEFAULT_PAGE_SIZE = 20
export const DEFAULT_QUERY_TIMEOUT = 30000

// Navigation
export const NAVIGATION_ITEMS = [
  { label: 'Chat', href: '/chat', icon: 'MessageSquare' },
  { label: 'Activities', href: '/activities', icon: 'Activity' },
  { label: 'Memory', href: '/memory', icon: 'Brain' },
  { label: 'Approvals', href: '/approvals', icon: 'CheckCircle' },
  { label: 'Automations', href: '/automations', icon: 'Zap' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
]

// Cache Keys for React Query
export const QUERY_KEYS = {
  SESSIONS: ['sessions'],
  SESSION: (id: string) => ['session', id],
  PROFILE: ['profile'],
  MODELS: ['models'],
  ACTIVITIES: ['activities'],
  ACTIVITY: (id: string) => ['activity', id],
  MEMORY_SEARCH: (query: string) => ['memory', 'search', query],
  MEMORY_RECENT: ['memory', 'recent'],
  APPROVALS: ['approvals'],
  APPROVAL: (id: string) => ['approval', id],
  AUTOMATIONS: ['automations'],
  AUTOMATION: (id: string) => ['automation', id],
  REMINDERS: ['reminders'],
  REMINDER: (id: string) => ['reminder', id],
}

// UI Constants
export const SIDEBAR_WIDTH = 280
export const MOBILE_BREAKPOINT = 768

// Animations
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
}

// Default values
export const DEFAULT_COMMUNICATION_STYLE = 'professional'
export const DEFAULT_WORK_PATTERN = '9am-5pm'

// Markdown configuration
export const MARKDOWN_OPTIONS = {
  breaks: true,
  gfm: true,
}

// Toast messages
export const TOAST_MESSAGES = {
  PROFILE_UPDATED: 'Profile updated successfully',
  AUTOMATION_CREATED: 'Automation created successfully',
  AUTOMATION_UPDATED: 'Automation updated successfully',
  AUTOMATION_DELETED: 'Automation deleted successfully',
  APPROVAL_APPROVED: 'Approval submitted successfully',
  APPROVAL_REJECTED: 'Approval rejected successfully',
  SESSION_CLOSED: 'Session closed successfully',
  ERROR_GENERIC: 'An error occurred. Please try again.',
  COPY_TO_CLIPBOARD: 'Copied to clipboard',
}

// Validation patterns
export const VALIDATION = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
}
