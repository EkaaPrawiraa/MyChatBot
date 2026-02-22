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
	googleClientID     string
	googleClientSecret string
	googleRedirectURL  string
	xClientID     string
	xClientSecret string
	xRedirectURI  string
	dashboardURL string
}

func NewIntegrationsUsecase(
	repo domain.OwnerIntegrationsRepository,
	googleClientID, googleClientSecret, googleRedirectURL string,
	xClientID, xClientSecret, xRedirectURI string,
	dashboardURL string,
) domain.IntegrationsUsecase {
	return &integrationsUsecase{
		repo:         repo,
		googleClientID:     googleClientID,
		googleClientSecret: googleClientSecret,
		googleRedirectURL:  googleRedirectURL,
		xClientID:     xClientID,
		xClientSecret: xClientSecret,
		xRedirectURI:  xRedirectURI,
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


func (u *integrationsUsecase) googleOAuthConfig() (*oauth2.Config, error) {
	if u.googleClientID == "" || u.googleClientSecret == "" || u.googleRedirectURL == "" {
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
		"https://www.googleapis.com/auth/drive.file",
		"https://www.googleapis.com/auth/documents",
		"https://www.googleapis.com/auth/spreadsheets",
		"https://www.googleapis.com/auth/youtube.readonly",
		"https://www.googleapis.com/auth/yt-analytics.readonly",
	}

	return &oauth2.Config{
		ClientID:     u.googleClientID,
		ClientSecret: u.googleClientSecret,
		RedirectURL:  u.googleRedirectURL,
		Scopes:       scopes,
		Endpoint:     google.Endpoint,
	}, nil
}

func (u *integrationsUsecase) xOAuthConfig() (*oauth2.Config, error) {
	if strings.TrimSpace(u.xClientID) == "" || strings.TrimSpace(u.xClientSecret) == "" || strings.TrimSpace(u.xRedirectURI) == "" {
		return nil, apperror.Validation("X OAuth is not configured (X_CLIENT_ID/SECRET/REDIRECT_URI)")
	}

	// User-context connection scopes.
	// offline.access enables refresh tokens.
	scopes := []string{
		"tweet.read",
		"tweet.write",
		"users.read",
		"offline.access",
	}

	return &oauth2.Config{
		ClientID:     strings.TrimSpace(u.xClientID),
		ClientSecret: strings.TrimSpace(u.xClientSecret),
		RedirectURL:  strings.TrimSpace(u.xRedirectURI),
		Scopes:       scopes,
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://twitter.com/i/oauth2/authorize",
			TokenURL: "https://api.twitter.com/2/oauth2/token",
		},
	}, nil
}

func (u *integrationsUsecase) GoogleAuthURL(state string) (string, error) {
	cfg, err := u.googleOAuthConfig()
	if err != nil {
		return "", err
	}
	return cfg.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce), nil
}

func (u *integrationsUsecase) HandleGoogleCallback(ctx context.Context, code string) error {
	cfg, err := u.googleOAuthConfig()
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

func (u *integrationsUsecase) XAuthURL(state, codeChallenge string) (string, error) {
	cfg, err := u.xOAuthConfig()
	if err != nil {
		return "", err
	}

	// X requires PKCE parameters for OAuth2.
	return cfg.AuthCodeURL(
		state,
		oauth2.SetAuthURLParam("code_challenge", codeChallenge),
		oauth2.SetAuthURLParam("code_challenge_method", "S256"),
		// Helps ensure we get a refresh token.
		oauth2.SetAuthURLParam("prompt", "consent"),
	), nil
}

func (u *integrationsUsecase) HandleXCallback(ctx context.Context, code, codeVerifier string) error {
	cfg, err := u.xOAuthConfig()
	if err != nil {
		return err
	}

	tok, err := cfg.Exchange(
		ctx,
		code,
		oauth2.SetAuthURLParam("code_verifier", codeVerifier),
	)
	if err != nil {
		return apperror.ExternalError(err, "failed to exchange X OAuth code")
	}

	var expiry *time.Time
	if !tok.Expiry.IsZero() {
		e := tok.Expiry
		expiry = &e
	}

	scope := ""
	if v := tok.Extra("scope"); v != nil {
		if s, ok := v.(string); ok {
			scope = s
		}
	}

	// Persist tokens for later tool calls.
	// Note: tok.RefreshToken may be empty on subsequent authorizations; repo keeps the prior one.
	return u.repo.UpsertXOAuth2(ctx, tok.AccessToken, tok.RefreshToken, expiry, scope)
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

	status.Telegram.Configured = strings.TrimSpace(integ.TelegramBotToken) != ""
	status.Telegram.BotTokenMasked = maskSecret(integ.TelegramBotToken)

	status.Discord.Configured = strings.TrimSpace(integ.DiscordWebhookURL) != "" || strings.TrimSpace(integ.DiscordBotToken) != ""
	status.Discord.WebhookMasked = maskSecret(integ.DiscordWebhookURL)
	status.Discord.BotTokenMasked = maskSecret(integ.DiscordBotToken)

	xOAuth1Configured := strings.TrimSpace(integ.XAPIKey) != "" &&
		strings.TrimSpace(integ.XAPISecret) != "" &&
		strings.TrimSpace(integ.XAccessToken) != "" &&
		strings.TrimSpace(integ.XAccessTokenSecret) != ""
	xBearerConfigured := strings.TrimSpace(integ.XBearerToken) != ""
	xOAuth2Configured := strings.TrimSpace(integ.XOAuth2AccessToken) != "" || strings.TrimSpace(integ.XOAuth2RefreshToken) != ""
	status.X.Configured = xOAuth1Configured || xBearerConfigured || xOAuth2Configured
	status.X.APIKeyMasked = maskSecret(integ.XAPIKey)
	status.X.AccessTokenMasked = maskSecret(integ.XAccessToken)
	status.X.BearerTokenMasked = maskSecret(integ.XBearerToken)
	status.X.OAuth2AccessTokenMasked = maskSecret(integ.XOAuth2AccessToken)

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

func (u *integrationsUsecase) UpsertTelegram(ctx context.Context, botToken string) error {
	if strings.TrimSpace(botToken) == "" {
		return apperror.Validation("telegram_bot_token is required")
	}
	return u.repo.UpsertTelegram(ctx, botToken)
}

func (u *integrationsUsecase) DisconnectTelegram(ctx context.Context) error {
	return u.repo.ClearTelegram(ctx)
}

func (u *integrationsUsecase) UpsertDiscord(ctx context.Context, webhookURL, botToken string) error {
	if strings.TrimSpace(webhookURL) == "" && strings.TrimSpace(botToken) == "" {
		return apperror.Validation("discord_webhook_url or discord_bot_token is required")
	}
	return u.repo.UpsertDiscord(ctx, webhookURL, botToken)
}

func (u *integrationsUsecase) DisconnectDiscord(ctx context.Context) error {
	return u.repo.ClearDiscord(ctx)
}

func (u *integrationsUsecase) UpsertX(ctx context.Context, apiKey, apiSecret, accessToken, accessTokenSecret, bearerToken string) error {
	apiKey = strings.TrimSpace(apiKey)
	apiSecret = strings.TrimSpace(apiSecret)
	accessToken = strings.TrimSpace(accessToken)
	accessTokenSecret = strings.TrimSpace(accessTokenSecret)
	bearerToken = strings.TrimSpace(bearerToken)

	hasAny := apiKey != "" || apiSecret != "" || accessToken != "" || accessTokenSecret != "" || bearerToken != ""
	if !hasAny {
		return apperror.Validation("x_bearer_token or OAuth 1.0a credentials are required")
	}

	// OAuth 1.0a (user-context) requires all four fields.
	// If the user provides only API key/secret (common when they only intend app-only bearer usage),
	// we allow it as long as a bearer token is present.
	anyOAuth1 := apiKey != "" || apiSecret != "" || accessToken != "" || accessTokenSecret != ""
	if anyOAuth1 {
		missingAny := apiKey == "" || apiSecret == "" || accessToken == "" || accessTokenSecret == ""
		if missingAny {
			// Allow partial OAuth1 only when we're configured for bearer usage.
			if bearerToken == "" {
				return apperror.Validation("x_api_key, x_api_secret, x_access_token, and x_access_token_secret are required for OAuth 1.0a")
			}
			// If access token pieces are provided, we assume they intended OAuth1 and should provide the full set.
			if accessToken != "" || accessTokenSecret != "" {
				return apperror.Validation("x_api_key, x_api_secret, x_access_token, and x_access_token_secret are required for OAuth 1.0a")
			}
		}
	}

	return u.repo.UpsertX(ctx, apiKey, apiSecret, accessToken, accessTokenSecret, bearerToken)
}

func (u *integrationsUsecase) DisconnectX(ctx context.Context) error {
	return u.repo.ClearX(ctx)
}
