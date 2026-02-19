package domain

import (
	"context"

	"github.com/google/uuid"
)

// OwnerProfileRepository manages the single owner profile.
type OwnerProfileRepository interface {
	Get(ctx context.Context) (*OwnerProfile, error)
	Update(ctx context.Context, profile *OwnerProfile) error
}

// SessionRepository manages conversation sessions.
type SessionRepository interface {
	Create(ctx context.Context, session *Session) error
	GetByID(ctx context.Context, id uuid.UUID) (*Session, error)
	List(ctx context.Context, limit int) ([]Session, error)
	Close(ctx context.Context, id uuid.UUID) error
}

// ShortTermMemoryRepository manages in-session conversation messages.
type ShortTermMemoryRepository interface {
	Store(ctx context.Context, mem *ShortTermMemory) error
	GetBySession(ctx context.Context, sessionID uuid.UUID, limit int) ([]ShortTermMemory, error)
	DeleteBySession(ctx context.Context, sessionID uuid.UUID) error
}

// LongTermMemoryRepository manages vector-embedded knowledge.
type LongTermMemoryRepository interface {
	Store(ctx context.Context, mem *LongTermMemory) error
	SearchSimilar(ctx context.Context, embedding []float32, limit int) ([]LongTermMemory, error)
	GetRecent(ctx context.Context, limit int) ([]LongTermMemory, error)
	GetByCategory(ctx context.Context, category string, limit int) ([]LongTermMemory, error)
}

// ActivityLogRepository manages execution traces.
type ActivityLogRepository interface {
	Create(ctx context.Context, log *ActivityLog) error
	List(ctx context.Context, limit, offset int) ([]ActivityLog, error)
	GetByID(ctx context.Context, id uuid.UUID) (*ActivityLog, error)
	GetBySession(ctx context.Context, sessionID uuid.UUID, limit int) ([]ActivityLog, error)
}

// ReminderRepository manages scheduled reminders.
type ReminderRepository interface {
	Create(ctx context.Context, reminder *Reminder) error
	List(ctx context.Context, limit int) ([]Reminder, error)
	GetDue(ctx context.Context) ([]Reminder, error)
	MarkSent(ctx context.Context, id uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// AutomationRuleRepository manages trigger-based automations.
type AutomationRuleRepository interface {
	Create(ctx context.Context, rule *AutomationRule) error
	List(ctx context.Context) ([]AutomationRule, error)
	GetByID(ctx context.Context, id uuid.UUID) (*AutomationRule, error)
	Update(ctx context.Context, rule *AutomationRule) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByTrigger(ctx context.Context, triggerType string) ([]AutomationRule, error)
}

// ApprovalRepository manages pending human-in-the-loop approvals.
type ApprovalRepository interface {
	Create(ctx context.Context, item *ApprovalItem) error
	GetPending(ctx context.Context) ([]ApprovalItem, error)
	GetByID(ctx context.Context, id uuid.UUID) (*ApprovalItem, error)
	Resolve(ctx context.Context, id uuid.UUID, status, feedback string, modifiedPlan []byte) error
}
