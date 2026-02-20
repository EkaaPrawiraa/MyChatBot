package postgres

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type approvalRepo struct {
	db *sqlx.DB
}

func NewApprovalRepository(db *sqlx.DB) domain.ApprovalRepository {
	return &approvalRepo{db: db}
}

func (r *approvalRepo) Create(ctx context.Context, item *domain.ApprovalItem) error {
	if item.ID == uuid.Nil {
		item.ID = uuid.New()
	}
	query := `
		INSERT INTO approval_queue (id, session_id, proposed_plan, status, created_at)
		VALUES ($1, $2, $3::jsonb, 'pending', NOW())
		RETURNING created_at`
	proposed := string(item.ProposedPlan)
	return r.db.QueryRowxContext(ctx, query,
		item.ID, item.SessionID, proposed,
	).Scan(&item.CreatedAt)
}

func (r *approvalRepo) GetPending(ctx context.Context) ([]domain.ApprovalItem, error) {
	var items []domain.ApprovalItem
	err := r.db.SelectContext(ctx, &items,
		`SELECT * FROM approval_queue WHERE status = 'pending' ORDER BY created_at DESC`)
	return items, err
}

func (r *approvalRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.ApprovalItem, error) {
	var item domain.ApprovalItem
	err := r.db.GetContext(ctx, &item,
		`SELECT * FROM approval_queue WHERE id = $1`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrApprovalNotFound
	}
	return &item, err
}

func (r *approvalRepo) Resolve(ctx context.Context, id uuid.UUID, status, feedback string, modifiedPlan []byte) error {
	now := time.Now()
	var modified any
	if len(modifiedPlan) > 0 {
		modified = string(modifiedPlan)
	} else {
		modified = nil
	}
	res, err := r.db.ExecContext(ctx, `
		UPDATE approval_queue
		SET status = $1, user_feedback = $2, modified_plan = $3::jsonb, resolved_at = $4
		WHERE id = $5 AND status = 'pending'`,
		status, feedback, modified, now, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return domain.ErrApprovalResolved
	}
	return nil
}
