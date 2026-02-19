// User & Profile Types
export interface UserProfile {
  id: string
  name: string
  email: string
  meetingHours?: string
  focusHours?: string
  communicationStyle?: string
  workPattern?: string
  createdAt: string
  updatedAt: string
}

// Session Types
export interface Session {
  id: string
  title: string
  startTime: string
  endTime?: string
  closed: boolean
  createdAt: string
  updatedAt: string
}

// Message & Chat Types
export interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  intent?: string
  toolsUsed?: string[]
  latency?: number
  requiresApproval?: boolean
  approvalId?: string
  createdAt: string
}

export interface ChatRequest {
  sessionId: string
  message: string
}

export interface ChatResponse {
  id: string
  sessionId: string
  message: string
  intent?: string
  toolsUsed?: string[]
  latency: number
  requiresApproval: boolean
  approvalId?: string
}

export interface VoiceRequest {
  sessionId: string
  audio: Blob
}

export interface VoiceTranscriptionResponse {
  transcription: string
  confidence: number
}

// Models Types
export interface Model {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'xai'
  contextWindow: number
  costPer1kTokens: number
}

export interface ModelsResponse {
  models: Model[]
}

// Activity Types
export interface ActivityLog {
  id: string
  sessionId: string
  query: string
  intent: string
  tools: string[]
  success: boolean
  error?: string
  latency: number
  executionPlan?: string
  createdAt: string
}

export interface ActivitiesResponse {
  activities: ActivityLog[]
  total: number
  page: number
  pageSize: number
}

// Memory Types
export interface LongTermMemory {
  id: string
  content: string
  category?: string
  source?: string
  embedding?: number[]
  createdAt: string
  updatedAt: string
}

export interface MemorySearchResponse {
  memories: LongTermMemory[]
  total: number
}

// Approval Types
export interface ApprovalItem {
  id: string
  sessionId: string
  proposedPlan: string
  steps: ApprovalStep[]
  status: 'pending' | 'approved' | 'rejected'
  feedback?: string
  createdAt: string
  updatedAt: string
}

export interface ApprovalStep {
  id: string
  title: string
  description: string
  tool: string
  parameters: Record<string, unknown>
}

export interface ApprovalResponse {
  id: string
  status: 'approved' | 'rejected'
  feedback?: string
}

// Automation Types
export interface AutomationRule {
  id: string
  name: string
  trigger: string
  condition: string
  action: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface AutomationCreateRequest {
  name: string
  trigger: string
  condition: string
  action: string
  enabled: boolean
}

export interface AutomationUpdateRequest extends AutomationCreateRequest {}

// Reminder Types
export interface Reminder {
  id: string
  userId: string
  title: string
  description?: string
  dueDate: string
  priority: 'low' | 'medium' | 'high'
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface ReminderCreateRequest {
  title: string
  description?: string
  dueDate: string
  priority: 'low' | 'medium' | 'high'
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
  }
}

export interface PaginationParams {
  page: number
  pageSize: number
}

// Request/Response Envelope
export interface APIEnvelope<T> {
  status: string
  data: T
  message?: string
  timestamp?: string
}
