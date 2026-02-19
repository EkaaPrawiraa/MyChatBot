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

// SessionUsecase manages conversation sessions.
type SessionUsecase interface {
	Create(ctx context.Context) (*Session, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Session, error)
	List(ctx context.Context, limit int) ([]Session, error)
	Close(ctx context.Context, id uuid.UUID) error
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
