package postgres

import (
	"context"
	"fmt"
	"strings"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type longTermMemoryRepo struct {
	db *sqlx.DB
}

func NewLongTermMemoryRepository(db *sqlx.DB) domain.LongTermMemoryRepository {
	return &longTermMemoryRepo{db: db}
}

func (r *longTermMemoryRepo) Store(ctx context.Context, m *domain.LongTermMemory) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	if m.Metadata == nil {
		m.Metadata = []byte("{}")
	}
	query := `
		INSERT INTO conversation_memory_long (id, content, embedding, category, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		RETURNING created_at`
	embStr := floatsToVector(m.Embedding)
	return r.db.QueryRowxContext(ctx, query,
		m.ID, m.Content, embStr, m.Category, m.Metadata,
	).Scan(&m.CreatedAt)
}

func (r *longTermMemoryRepo) SearchSimilar(ctx context.Context, embedding []float32, limit int) ([]domain.LongTermMemory, error) {
	var memories []domain.LongTermMemory
	query := `
		SELECT id, content, category, metadata, created_at
		FROM conversation_memory_long
		ORDER BY embedding <-> $1
		LIMIT $2`
	err := r.db.SelectContext(ctx, &memories, query, floatsToVector(embedding), limit)
	return memories, err
}

func (r *longTermMemoryRepo) GetRecent(ctx context.Context, limit int) ([]domain.LongTermMemory, error) {
	var memories []domain.LongTermMemory
	query := `
		SELECT id, content, category, metadata, created_at
		FROM conversation_memory_long
		ORDER BY created_at DESC
		LIMIT $1`
	err := r.db.SelectContext(ctx, &memories, query, limit)
	return memories, err
}

func (r *longTermMemoryRepo) GetByCategory(ctx context.Context, category string, limit int) ([]domain.LongTermMemory, error) {
	var memories []domain.LongTermMemory
	query := `
		SELECT id, content, category, metadata, created_at
		FROM conversation_memory_long
		WHERE category = $1
		ORDER BY created_at DESC
		LIMIT $2`
	err := r.db.SelectContext(ctx, &memories, query, category, limit)
	return memories, err
}

// floatsToVector converts []float32 to pgvector literal "[0.1,0.2,...]".
func floatsToVector(v []float32) string {
	if len(v) == 0 {
		return ""
	}
	parts := make([]string, len(v))
	for i, f := range v {
		parts[i] = fmt.Sprintf("%g", f)
	}
	return "[" + strings.Join(parts, ",") + "]"
}
