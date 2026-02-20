package postgres

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/jmoiron/sqlx"
)

type ownerIntegrationsRepo struct {
	db *sqlx.DB
}

func NewOwnerIntegrationsRepository(db *sqlx.DB) domain.OwnerIntegrationsRepository {
	return &ownerIntegrationsRepo{db: db}
}

func (r *ownerIntegrationsRepo) Get(ctx context.Context) (*domain.OwnerIntegrations, error) {
	var integ domain.OwnerIntegrations
	err := r.db.GetContext(ctx, &integ, `SELECT * FROM owner_integrations WHERE owner_id = 1`)
	if errors.Is(err, sql.ErrNoRows) {
		// Ensure row exists.
		_, insErr := r.db.ExecContext(ctx, `INSERT INTO owner_integrations (owner_id) VALUES (1) ON CONFLICT (owner_id) DO NOTHING`)
		if insErr != nil {
			return nil, insErr
		}
		err = r.db.GetContext(ctx, &integ, `SELECT * FROM owner_integrations WHERE owner_id = 1`)
	}
	if err != nil {
		return nil, err
	}
	return &integ, nil
}

func (r *ownerIntegrationsRepo) UpsertGoogle(ctx context.Context, email, refreshToken, accessToken string, expiry *time.Time) error {
	query := `
		UPDATE owner_integrations SET
			google_email = $1,
			google_refresh_token = COALESCE(NULLIF($2, ''), google_refresh_token),
			google_access_token = $3,
			google_token_expiry = $4,
			updated_at = NOW()
		WHERE owner_id = 1`
	_, err := r.db.ExecContext(ctx, query, email, refreshToken, accessToken, expiry)
	return err
}

func (r *ownerIntegrationsRepo) ClearGoogle(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE owner_integrations SET
			google_email = '',
			google_refresh_token = '',
			google_access_token = '',
			google_token_expiry = NULL,
			updated_at = NOW()
		WHERE owner_id = 1`)
	return err
}

func (r *ownerIntegrationsRepo) UpsertWhatsApp(ctx context.Context, phoneNumberID, businessAccountID, apiToken string) error {
	query := `
		UPDATE owner_integrations SET
			whatsapp_phone_number_id = $1,
			whatsapp_business_account_id = $2,
			whatsapp_api_token = COALESCE(NULLIF($3, ''), whatsapp_api_token),
			updated_at = NOW()
		WHERE owner_id = 1`
	_, err := r.db.ExecContext(ctx, query, phoneNumberID, businessAccountID, apiToken)
	return err
}

func (r *ownerIntegrationsRepo) ClearWhatsApp(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE owner_integrations SET
			whatsapp_phone_number_id = '',
			whatsapp_business_account_id = '',
			whatsapp_api_token = '',
			updated_at = NOW()
		WHERE owner_id = 1`)
	return err
}
