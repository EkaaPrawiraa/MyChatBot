package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// OwnerProfile is the single owner of the system (like Tony Stark for Jarvis).
type OwnerProfile struct {
	ID                    int       `json:"id" db:"id"` // always 1
	Name                  string    `json:"name" db:"name"`
	Email                 string    `json:"email" db:"email"`
	PreferredMeetingHours string    `json:"preferred_meeting_hours" db:"preferred_meeting_hours"`
	FocusHours            string    `json:"focus_hours" db:"focus_hours"`
	CommunicationStyle    string    `json:"communication_style" db:"communication_style"`
	WorkPattern           string    `json:"work_pattern" db:"work_pattern"`
	FrequentContacts      []byte    `json:"frequent_contacts" db:"frequent_contacts"`
	Preferences           []byte    `json:"preferences" db:"preferences"`

	// AI Engine configuration — owner chooses provider + supplies their API key.
	AIProvider string `json:"ai_provider" db:"ai_provider"` // openai | anthropic | xai
	AIAPIKey   string `json:"-" db:"ai_api_key"`             // NEVER exposed in JSON responses
	AIModel    string `json:"ai_model" db:"ai_model"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// OwnerIntegrations stores third-party credentials/config for the single owner.
// Sensitive fields must never be exposed in public JSON responses.
type OwnerIntegrations struct {
	OwnerID int `json:"owner_id" db:"owner_id"`

	GoogleEmail       string    `json:"google_email" db:"google_email"`
	GoogleRefreshToken string   `json:"-" db:"google_refresh_token"`
	GoogleAccessToken  string   `json:"-" db:"google_access_token"`
	GoogleTokenExpiry  time.Time `json:"-" db:"google_token_expiry"`

	WhatsAppPhoneNumberID     string `json:"whatsapp_phone_number_id" db:"whatsapp_phone_number_id"`
	WhatsAppBusinessAccountID string `json:"whatsapp_business_account_id" db:"whatsapp_business_account_id"`
	WhatsAppAPIToken          string `json:"-" db:"whatsapp_api_token"`

	TelegramBotToken string `json:"-" db:"telegram_bot_token"`

	DiscordWebhookURL string `json:"-" db:"discord_webhook_url"`
	DiscordBotToken   string `json:"-" db:"discord_bot_token"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// IntegrationsStatus is safe to return to the dashboard.
type IntegrationsStatus struct {
	Google struct {
		Connected bool   `json:"connected"`
		Email     string `json:"email"`
	} `json:"google"`

	WhatsApp struct {
		Configured         bool   `json:"configured"`
		PhoneNumberID      string `json:"phone_number_id"`
		BusinessAccountID  string `json:"business_account_id"`
		APITokenMasked     string `json:"api_token_masked"`
	} `json:"whatsapp"`

	Telegram struct {
		Configured     bool   `json:"configured"`
		BotTokenMasked string `json:"bot_token_masked"`
	} `json:"telegram"`

	Discord struct {
		Configured        bool   `json:"configured"`
		WebhookMasked     string `json:"webhook_masked"`
		BotTokenMasked    string `json:"bot_token_masked"`
	} `json:"discord"`
}

// AIKeyMasked returns a masked representation of the API key for display.
func (o *OwnerProfile) AIKeyMasked() string {
	if len(o.AIAPIKey) <= 8 {
		if o.AIAPIKey == "" {
			return ""
		}
		return "****"
	}
	return o.AIAPIKey[:4] + "..." + o.AIAPIKey[len(o.AIAPIKey)-4:]
}

// Session represents a conversation session.
type Session struct {
	ID        uuid.UUID `json:"id" db:"id"`
	Title     string    `json:"title" db:"title"`
	Active    bool      `json:"active" db:"active"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// ShortTermMemory is a single message in a conversation session.
type ShortTermMemory struct {
	ID        uuid.UUID       `json:"id" db:"id"`
	SessionID uuid.UUID       `json:"session_id" db:"session_id"`
	Role      string          `json:"role" db:"role"` // user | assistant | system
	Message   string          `json:"message" db:"message"`
	Metadata  json.RawMessage `json:"metadata,omitempty" db:"metadata"`
	CreatedAt time.Time       `json:"created_at" db:"created_at"`
}

// LongTermMemory is a vector-embedded memory entry (knowledge base).
type LongTermMemory struct {
	ID        uuid.UUID       `json:"id" db:"id"`
	Content   string          `json:"content" db:"content"`
	Embedding []float32       `json:"-" db:"embedding"`
	Category  string          `json:"category" db:"category"`
	Metadata  json.RawMessage `json:"metadata,omitempty" db:"metadata"`
	CreatedAt time.Time       `json:"created_at" db:"created_at"`
}

// ActivityLog is a single agent execution trace.
type ActivityLog struct {
	ID               uuid.UUID `json:"id" db:"id"`
	SessionID        uuid.UUID `json:"session_id,omitempty" db:"session_id"`
	UserQuery        string    `json:"user_query" db:"user_query"`
	Intent           string    `json:"intent" db:"intent"`
	ExecutionPlan    []byte    `json:"execution_plan" db:"execution_plan"`
	ToolsUsed        []byte    `json:"tools_used" db:"tools_used"`
	ExecutionResults []byte    `json:"execution_results" db:"execution_results"`
	Success          bool      `json:"success" db:"success"`
	ErrorMessage     string    `json:"error_message,omitempty" db:"error_message"`
	LatencyMs        int       `json:"latency_ms" db:"latency_ms"`
	TokenUsage       int       `json:"token_usage" db:"token_usage"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
}

// Reminder is a scheduled notification.
type Reminder struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Title       string    `json:"title" db:"title"`
	Description string    `json:"description" db:"description"`
	ScheduledAt time.Time `json:"scheduled_at" db:"scheduled_at"`
	Sent        bool      `json:"sent" db:"sent"`
	SentVia     string    `json:"sent_via" db:"sent_via"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// AutomationRule defines a trigger-based automation.
type AutomationRule struct {
	ID            uuid.UUID `json:"id" db:"id"`
	Name          string    `json:"name" db:"name"`
	TriggerType   string    `json:"trigger_type" db:"trigger_type"`
	ConditionJSON []byte    `json:"condition_json" db:"condition_json"`
	ActionJSON    []byte    `json:"action_json" db:"action_json"`
	Enabled       bool      `json:"enabled" db:"enabled"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

// ApprovalItem represents a pending human-in-the-loop approval.
type ApprovalItem struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	SessionID    uuid.UUID  `json:"session_id" db:"session_id"`
	ProposedPlan []byte     `json:"proposed_plan" db:"proposed_plan"`
	Status       string     `json:"status" db:"status"` // pending | approved | rejected | expired
	UserFeedback *string    `json:"user_feedback,omitempty" db:"user_feedback"`
	ModifiedPlan []byte     `json:"modified_plan,omitempty" db:"modified_plan"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	ResolvedAt   *time.Time `json:"resolved_at,omitempty" db:"resolved_at"`
}
