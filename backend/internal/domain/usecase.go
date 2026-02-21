package domain

import (
	"context"

	"github.com/google/uuid"
)

// ---------- Usecase Interfaces ----------

// ProfileUsecase manages the owner profile.
type ProfileUsecase interface {
	GetProfile(ctx context.Context) (*OwnerProfile, error)
	UpdateProfile(ctx context.Context, profile *OwnerProfile) error
}

// IntegrationsUsecase manages third-party credential configuration.
type IntegrationsUsecase interface {
	GetStatus(ctx context.Context) (*IntegrationsStatus, error)
	DisconnectGoogle(ctx context.Context) error
	UpsertWhatsApp(ctx context.Context, phoneNumberID, businessAccountID, apiToken string) error
	DisconnectWhatsApp(ctx context.Context) error
	UpsertTelegram(ctx context.Context, botToken string) error
	DisconnectTelegram(ctx context.Context) error
	UpsertDiscord(ctx context.Context, webhookURL, botToken string) error
	DisconnectDiscord(ctx context.Context) error
	// Google OAuth flow
	GoogleAuthURL(state string) (string, error)
	HandleGoogleCallback(ctx context.Context, code string) error
}

// ToolsUsecase exposes real tool operations used by the Python orchestrator.
type ToolsUsecase interface {
	GmailUnread(ctx context.Context, maxResults int) (int, error)
	GmailSearch(ctx context.Context, query string, maxResults int) (any, error)
	GmailCategorizedUnread(ctx context.Context, maxResults int) (any, error)
	GmailSend(ctx context.Context, to, subject, body string) (any, error)
	CalendarList(ctx context.Context, timeMin, timeMax string, maxResults int) (any, error)
	CalendarCreate(ctx context.Context, payload map[string]any) (any, error)
	CalendarUpdate(ctx context.Context, eventID string, payload map[string]any) (any, error)
	CalendarDelete(ctx context.Context, eventID string) (any, error)
	CalendarFreeBusy(ctx context.Context, timeMin, timeMax string) (any, error)
	PeopleSearch(ctx context.Context, query string, pageSize int, pageToken string) (any, error)
	DriveSearch(ctx context.Context, query string, pageSize int, pageToken string) (any, error)
	DriveExport(ctx context.Context, fileID string, mimeType string, maxBytes int) (any, error)
	DriveCreateTextFile(ctx context.Context, name string, content string, mimeType string, parentID string) (any, error)
	DriveCreateGoogleDoc(ctx context.Context, name string, content string, parentID string) (any, error)
	DriveCreateGoogleSheet(ctx context.Context, name string, csvContent string, parentID string) (any, error)
	YouTubeAnalytics(ctx context.Context, startDate string, endDate string) (any, error)
	WhatsAppSend(ctx context.Context, to, message string) (any, error)
	TelegramSend(ctx context.Context, chatID, message string) (any, error)
	TelegramUpdates(ctx context.Context, offset int, limit int, timeoutSeconds int) (any, error)
	DiscordWebhookSend(ctx context.Context, content string, username string) (any, error)
}

// SessionUsecase manages conversation sessions.
type SessionUsecase interface {
	Create(ctx context.Context, title string) (*Session, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Session, error)
	List(ctx context.Context, limit int) ([]Session, error)
	Close(ctx context.Context, id uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// ChatUsecase proxies messages through the AI orchestrator.
type ChatUsecase interface {
	SendMessage(ctx context.Context, sessionID uuid.UUID, message string) (*ChatResponse, error)
}

// ChatResponse is what the AI orchestrator returns.
type ChatResponse struct {
	Reply            string `json:"reply"`
	Intent           string `json:"intent,omitempty"`
	RequiresApproval bool   `json:"requires_approval"`
	ApprovalID       string `json:"approval_id,omitempty"`
	ToolsUsed        []byte `json:"tools_used,omitempty"`
	LatencyMs        int    `json:"latency_ms,omitempty"`
}

// MemoryUsecase manages both short-term and long-term memory.
type MemoryUsecase interface {
	// Short-term
	StoreShortTerm(ctx context.Context, mem *ShortTermMemory) error
	GetConversation(ctx context.Context, sessionID uuid.UUID, limit int) ([]ShortTermMemory, error)
	// Long-term
	StoreLongTerm(ctx context.Context, mem *LongTermMemory) error
	SearchMemory(ctx context.Context, query string, limit int) ([]LongTermMemory, error)
	GetRecentMemories(ctx context.Context, limit int) ([]LongTermMemory, error)
}

// ActivityUsecase manages execution traces.
type ActivityUsecase interface {
	Log(ctx context.Context, log *ActivityLog) error
	GetLogs(ctx context.Context, limit, offset int) ([]ActivityLog, error)
}

// ReminderUsecase manages reminders + background worker.
type ReminderUsecase interface {
	Create(ctx context.Context, reminder *Reminder) error
	GetUpcoming(ctx context.Context, limit int) ([]Reminder, error)
	ProcessDue(ctx context.Context) error
}

// ApprovalUsecase manages plan approvals.
type ApprovalUsecase interface {
	GetPending(ctx context.Context) ([]ApprovalItem, error)
	Approve(ctx context.Context, id uuid.UUID, feedback string, modifiedPlan []byte) error
	Reject(ctx context.Context, id uuid.UUID, feedback string) error
}

// AutomationUsecase manages automation rules.
type AutomationUsecase interface {
	Create(ctx context.Context, rule *AutomationRule) error
	List(ctx context.Context) ([]AutomationRule, error)
	Update(ctx context.Context, rule *AutomationRule) error
	Delete(ctx context.Context, id uuid.UUID) error
}
