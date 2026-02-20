package postgres

import (
	"context"
	"database/sql"
	"errors"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type sessionRepo struct {
	db *sqlx.DB
}

func NewSessionRepository(db *sqlx.DB) domain.SessionRepository {
	return &sessionRepo{db: db}
}

func (r *sessionRepo) Create(ctx context.Context, s *domain.Session) error {
	query := `
		INSERT INTO sessions (id, title, active, created_at, updated_at)
		VALUES ($1, $2, TRUE, NOW(), NOW())
		RETURNING created_at, updated_at`
	return r.db.QueryRowxContext(ctx, query, s.ID, s.Title).Scan(&s.CreatedAt, &s.UpdatedAt)
}

func (r *sessionRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Session, error) {
	var s domain.Session
	err := r.db.GetContext(ctx, &s, `SELECT * FROM sessions WHERE id = $1`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrSessionNotFound
	}
	return &s, err
}

func (r *sessionRepo) List(ctx context.Context, limit int) ([]domain.Session, error) {
	var sessions []domain.Session
	err := r.db.SelectContext(ctx, &sessions,
		`SELECT * FROM sessions ORDER BY updated_at DESC LIMIT $1`, limit)
	return sessions, err
}

func (r *sessionRepo) Close(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE sessions SET active = FALSE, updated_at = NOW() WHERE id = $1`, id)
	return err
}

func (r *sessionRepo) Delete(ctx context.Context, id uuid.UUID) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM sessions WHERE id = $1`, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return domain.ErrSessionNotFound
	}
	return nil
}
