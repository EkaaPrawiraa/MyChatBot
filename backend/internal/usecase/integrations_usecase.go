package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/apperror"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type integrationsUsecase struct {
	repo         domain.OwnerIntegrationsRepository
	clientID     string
	clientSecret string
	redirectURL  string
	dashboardURL string
}

func NewIntegrationsUsecase(
	repo domain.OwnerIntegrationsRepository,
	clientID, clientSecret, redirectURL, dashboardURL string,
) domain.IntegrationsUsecase {
	return &integrationsUsecase{
		repo:         repo,
		clientID:     clientID,
		clientSecret: clientSecret,
		redirectURL:  redirectURL,
		dashboardURL: dashboardURL,
	}
}

func maskSecret(v string) string {
	if v == "" {
		return ""
	}
	if len(v) <= 8 {
		return "****"
	}
	return v[:4] + "..." + v[len(v)-4:]
}

func (u *integrationsUsecase) oauthConfig() (*oauth2.Config, error) {
	if u.clientID == "" || u.clientSecret == "" || u.redirectURL == "" {
		return nil, apperror.Validation("Google OAuth is not configured (GOOGLE_CLIENT_ID/SECRET/REDIRECT_URL)")
	}

	// Scopes: Gmail read+send, Calendar read+write, and userinfo for email.
	// Extended: People (contacts), Drive, and YouTube (Data + Analytics).
	scopes := []string{
		"openid",
		"email",
		"profile",
		"https://www.googleapis.com/auth/gmail.readonly",
		"https://www.googleapis.com/auth/gmail.send",
		"https://www.googleapis.com/auth/calendar",
		"https://www.googleapis.com/auth/contacts.readonly",
		"https://www.googleapis.com/auth/drive.readonly",
		"https://www.googleapis.com/auth/youtube.readonly",
		"https://www.googleapis.com/auth/yt-analytics.readonly",
	}

	return &oauth2.Config{
		ClientID:     u.clientID,
		ClientSecret: u.clientSecret,
		RedirectURL:  u.redirectURL,
		Scopes:       scopes,
		Endpoint:     google.Endpoint,
	}, nil
}

func (u *integrationsUsecase) GoogleAuthURL(state string) (string, error) {
	cfg, err := u.oauthConfig()
	if err != nil {
		return "", err
	}
	return cfg.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce), nil
}

func (u *integrationsUsecase) HandleGoogleCallback(ctx context.Context, code string) error {
	cfg, err := u.oauthConfig()
	if err != nil {
		return err
	}

	tok, err := cfg.Exchange(ctx, code)
	if err != nil {
		return apperror.ExternalError(err, "failed to exchange Google OAuth code")
	}

	// Fetch the owner's email address (needed for display/status).
	email, err := fetchGoogleEmail(ctx, tok.AccessToken)
	if err != nil {
		return err
	}

	var expiry *time.Time
	if !tok.Expiry.IsZero() {
		e := tok.Expiry
		expiry = &e
	}

	// Persist tokens. Refresh token may be empty on subsequent authorizations; repo keeps the prior one.
	return u.repo.UpsertGoogle(ctx, email, tok.RefreshToken, tok.AccessToken, expiry)
}

func fetchGoogleEmail(ctx context.Context, accessToken string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://www.googleapis.com/oauth2/v2/userinfo?alt=json", nil)
	if err != nil {
		return "", apperror.Wrap(err, apperror.CodeInternal, "failed to create google userinfo request", http.StatusInternalServerError)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", apperror.ExternalError(err, "google userinfo request failed")
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", apperror.ExternalError(fmt.Errorf("status %d", resp.StatusCode), "google userinfo returned error")
	}

	var parsed struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return "", apperror.ExternalError(err, "failed to decode google userinfo")
	}
	if strings.TrimSpace(parsed.Email) == "" {
		return "", apperror.ExternalError(fmt.Errorf("missing email"), "google userinfo missing email")
	}
	return parsed.Email, nil
}

func (u *integrationsUsecase) GetStatus(ctx context.Context) (*domain.IntegrationsStatus, error) {
	integ, err := u.repo.Get(ctx)
	if err != nil {
		return nil, err
	}

	var status domain.IntegrationsStatus
	status.Google.Connected = integ.GoogleRefreshToken != ""
	status.Google.Email = integ.GoogleEmail

	status.WhatsApp.Configured = integ.WhatsAppAPIToken != "" && integ.WhatsAppPhoneNumberID != ""
	status.WhatsApp.PhoneNumberID = integ.WhatsAppPhoneNumberID
	status.WhatsApp.BusinessAccountID = integ.WhatsAppBusinessAccountID
	status.WhatsApp.APITokenMasked = maskSecret(integ.WhatsAppAPIToken)

	return &status, nil
}

func (u *integrationsUsecase) DisconnectGoogle(ctx context.Context) error {
	return u.repo.ClearGoogle(ctx)
}

func (u *integrationsUsecase) UpsertWhatsApp(ctx context.Context, phoneNumberID, businessAccountID, apiToken string) error {
	if strings.TrimSpace(phoneNumberID) == "" {
		return apperror.Validation("whatsapp_phone_number_id is required")
	}
	if strings.TrimSpace(apiToken) == "" {
		return apperror.Validation("whatsapp_api_token is required")
	}
	return u.repo.UpsertWhatsApp(ctx, phoneNumberID, businessAccountID, apiToken)
}

func (u *integrationsUsecase) DisconnectWhatsApp(ctx context.Context) error {
	return u.repo.ClearWhatsApp(ctx)
}
