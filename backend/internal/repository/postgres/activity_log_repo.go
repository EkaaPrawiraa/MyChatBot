package postgres

import (
	"context"
	"database/sql"
	"errors"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type activityLogRepo struct {
	db *sqlx.DB
}

func NewActivityLogRepository(db *sqlx.DB) domain.ActivityLogRepository {
	return &activityLogRepo{db: db}
}

func (r *activityLogRepo) Create(ctx context.Context, l *domain.ActivityLog) error {
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	query := `
		INSERT INTO activity_logs
			(id, session_id, user_query, intent, execution_plan, tools_used,
			 execution_results, success, error_message, latency_ms, token_usage, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW())
		RETURNING created_at`
	return r.db.QueryRowxContext(ctx, query,
		l.ID, l.SessionID, l.UserQuery, l.Intent,
		l.ExecutionPlan, l.ToolsUsed, l.ExecutionResults,
		l.Success, l.ErrorMessage, l.LatencyMs, l.TokenUsage,
	).Scan(&l.CreatedAt)
}

func (r *activityLogRepo) List(ctx context.Context, limit, offset int) ([]domain.ActivityLog, error) {
	var logs []domain.ActivityLog
	query := `
		SELECT id, session_id, user_query, intent, execution_plan, tools_used,
		       execution_results, success, error_message, latency_ms, token_usage, created_at
		FROM activity_logs
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`
	err := r.db.SelectContext(ctx, &logs, query, limit, offset)
	return logs, err
}

func (r *activityLogRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.ActivityLog, error) {
	var l domain.ActivityLog
	err := r.db.GetContext(ctx, &l,
		`SELECT * FROM activity_logs WHERE id = $1`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return &l, err
}

func (r *activityLogRepo) GetBySession(ctx context.Context, sessionID uuid.UUID, limit int) ([]domain.ActivityLog, error) {
	var logs []domain.ActivityLog
	query := `
		SELECT id, session_id, user_query, intent, execution_plan, tools_used,
		       execution_results, success, error_message, latency_ms, token_usage, created_at
		FROM activity_logs
		WHERE session_id = $1
		ORDER BY created_at DESC
		LIMIT $2`
	err := r.db.SelectContext(ctx, &logs, query, sessionID, limit)
	return logs, err
}
