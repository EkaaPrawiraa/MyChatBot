package postgres

import (
	"context"
	"database/sql"
	"errors"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/jmoiron/sqlx"
)

type ownerProfileRepo struct {
	db *sqlx.DB
}

func NewOwnerProfileRepository(db *sqlx.DB) domain.OwnerProfileRepository {
	return &ownerProfileRepo{db: db}
}

func (r *ownerProfileRepo) Get(ctx context.Context) (*domain.OwnerProfile, error) {
	var p domain.OwnerProfile
	err := r.db.GetContext(ctx, &p, `SELECT * FROM owner_profile WHERE id = 1`)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrProfileNotFound
	}
	return &p, err
}

func (r *ownerProfileRepo) Update(ctx context.Context, p *domain.OwnerProfile) error {
	query := `
		UPDATE owner_profile SET
			name = $1,
			email = $2,
			preferred_meeting_hours = $3,
			focus_hours = $4,
			communication_style = $5,
			work_pattern = $6,
			frequent_contacts = $7,
			preferences = $8,
			ai_provider = $9,
			ai_api_key = $10,
			ai_model = $11,
			updated_at = NOW()
		WHERE id = 1
		RETURNING updated_at`
	return r.db.QueryRowxContext(ctx, query,
		p.Name, p.Email,
		p.PreferredMeetingHours, p.FocusHours,
		p.CommunicationStyle, p.WorkPattern,
		p.FrequentContacts, p.Preferences,
		p.AIProvider, p.AIAPIKey, p.AIModel,
	).Scan(&p.UpdatedAt)
}
