package postgres

import (
	"context"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type reminderRepo struct {
	db *sqlx.DB
}

func NewReminderRepository(db *sqlx.DB) domain.ReminderRepository {
	return &reminderRepo{db: db}
}

func (r *reminderRepo) Create(ctx context.Context, rem *domain.Reminder) error {
	if rem.ID == uuid.Nil {
		rem.ID = uuid.New()
	}
	query := `
		INSERT INTO reminders (id, title, description, scheduled_at, sent, sent_via, created_at, updated_at)
		VALUES ($1, $2, $3, $4, FALSE, $5, NOW(), NOW())
		RETURNING created_at, updated_at`
	return r.db.QueryRowxContext(ctx, query,
		rem.ID, rem.Title, rem.Description, rem.ScheduledAt, rem.SentVia,
	).Scan(&rem.CreatedAt, &rem.UpdatedAt)
}

func (r *reminderRepo) List(ctx context.Context, limit int) ([]domain.Reminder, error) {
	var reminders []domain.Reminder
	err := r.db.SelectContext(ctx, &reminders,
		`SELECT * FROM reminders ORDER BY scheduled_at ASC LIMIT $1`, limit)
	return reminders, err
}

func (r *reminderRepo) GetDue(ctx context.Context) ([]domain.Reminder, error) {
	var reminders []domain.Reminder
	err := r.db.SelectContext(ctx, &reminders,
		`SELECT * FROM reminders WHERE sent = FALSE AND scheduled_at <= NOW() ORDER BY scheduled_at ASC`)
	return reminders, err
}

func (r *reminderRepo) MarkSent(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE reminders SET sent = TRUE, updated_at = NOW() WHERE id = $1`, id)
	return err
}

func (r *reminderRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM reminders WHERE id = $1`, id)
	return err
}
