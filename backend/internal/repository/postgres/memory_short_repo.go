package postgres

import (
	"context"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type shortTermMemoryRepo struct {
	db *sqlx.DB
}

func NewShortTermMemoryRepository(db *sqlx.DB) domain.ShortTermMemoryRepository {
	return &shortTermMemoryRepo{db: db}
}

func (r *shortTermMemoryRepo) Store(ctx context.Context, m *domain.ShortTermMemory) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	if m.Metadata == nil {
		m.Metadata = []byte("{}")
	}
	query := `
		INSERT INTO conversation_memory_short (id, session_id, role, message, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		RETURNING created_at`
	return r.db.QueryRowxContext(ctx, query,
		m.ID, m.SessionID, m.Role, m.Message, m.Metadata,
	).Scan(&m.CreatedAt)
}

func (r *shortTermMemoryRepo) GetBySession(ctx context.Context, sessionID uuid.UUID, limit int) ([]domain.ShortTermMemory, error) {
	var msgs []domain.ShortTermMemory
	query := `
		SELECT id, session_id, role, message, metadata, created_at
		FROM conversation_memory_short
		WHERE session_id = $1
		ORDER BY created_at ASC
		LIMIT $2`
	err := r.db.SelectContext(ctx, &msgs, query, sessionID, limit)
	return msgs, err
}

func (r *shortTermMemoryRepo) DeleteBySession(ctx context.Context, sessionID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM conversation_memory_short WHERE session_id = $1`, sessionID)
	return err
}
