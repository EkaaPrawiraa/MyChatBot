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

func (r *ownerIntegrationsRepo) UpsertTelegram(ctx context.Context, botToken string) error {
	query := `
		UPDATE owner_integrations SET
			telegram_bot_token = COALESCE(NULLIF($1, ''), telegram_bot_token),
			updated_at = NOW()
		WHERE owner_id = 1`
	_, err := r.db.ExecContext(ctx, query, botToken)
	return err
}

func (r *ownerIntegrationsRepo) ClearTelegram(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE owner_integrations SET
			telegram_bot_token = '',
			updated_at = NOW()
		WHERE owner_id = 1`)
	return err
}

func (r *ownerIntegrationsRepo) UpsertDiscord(ctx context.Context, webhookURL, botToken string) error {
	query := `
		UPDATE owner_integrations SET
			discord_webhook_url = COALESCE(NULLIF($1, ''), discord_webhook_url),
			discord_bot_token = COALESCE(NULLIF($2, ''), discord_bot_token),
			updated_at = NOW()
		WHERE owner_id = 1`
	_, err := r.db.ExecContext(ctx, query, webhookURL, botToken)
	return err
}

func (r *ownerIntegrationsRepo) ClearDiscord(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE owner_integrations SET
			discord_webhook_url = '',
			discord_bot_token = '',
			updated_at = NOW()
		WHERE owner_id = 1`)
	return err
}

func (r *ownerIntegrationsRepo) UpsertX(ctx context.Context, apiKey, apiSecret, accessToken, accessTokenSecret, bearerToken string) error {
	query := `
		UPDATE owner_integrations SET
			x_api_key = COALESCE(NULLIF($1, ''), x_api_key),
			x_api_secret = COALESCE(NULLIF($2, ''), x_api_secret),
			x_access_token = COALESCE(NULLIF($3, ''), x_access_token),
			x_access_token_secret = COALESCE(NULLIF($4, ''), x_access_token_secret),
			x_bearer_token = COALESCE(NULLIF($5, ''), x_bearer_token),
			updated_at = NOW()
		WHERE owner_id = 1`
	_, err := r.db.ExecContext(ctx, query, apiKey, apiSecret, accessToken, accessTokenSecret, bearerToken)
	return err
}

func (r *ownerIntegrationsRepo) UpsertXOAuth2(ctx context.Context, accessToken, refreshToken string, expiry *time.Time, scope string) error {
	query := `
		UPDATE owner_integrations SET
			x_oauth2_access_token = $1,
			x_oauth2_refresh_token = COALESCE(NULLIF($2, ''), x_oauth2_refresh_token),
			x_oauth2_token_expiry = $3,
			x_oauth2_scope = $4,
			updated_at = NOW()
		WHERE owner_id = 1`
	_, err := r.db.ExecContext(ctx, query, accessToken, refreshToken, expiry, scope)
	return err
}

func (r *ownerIntegrationsRepo) ClearX(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE owner_integrations SET
			x_api_key = '',
			x_api_secret = '',
			x_access_token = '',
			x_access_token_secret = '',
			x_bearer_token = '',
			x_oauth2_access_token = '',
			x_oauth2_refresh_token = '',
			x_oauth2_token_expiry = NULL,
			x_oauth2_scope = '',
			updated_at = NOW()
		WHERE owner_id = 1`)
	return err
}
