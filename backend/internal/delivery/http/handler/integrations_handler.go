package handler

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
)

type IntegrationsHandler struct {
	uc           domain.IntegrationsUsecase
	dashboardURL string
}

func NewIntegrationsHandler(uc domain.IntegrationsUsecase, dashboardURL string) *IntegrationsHandler {
	return &IntegrationsHandler{uc: uc, dashboardURL: dashboardURL}
}

const googleStateCookieName = "axis_google_oauth_state"

type oauthStateEntry struct {
	Verifier string
	Expires  time.Time
}

type oauthStateStore struct {
	mu sync.Mutex
	m  map[string]oauthStateEntry
}

func newOAuthStateStore() *oauthStateStore {
	return &oauthStateStore{m: map[string]oauthStateEntry{}}
}

func (s *oauthStateStore) put(state, verifier string, ttl time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.m[state] = oauthStateEntry{Verifier: verifier, Expires: time.Now().Add(ttl)}
}

func (s *oauthStateStore) pop(state string) (string, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.m[state]
	if !ok {
		return "", false
	}
	delete(s.m, state)
	if time.Now().After(entry.Expires) {
		return "", false
	}
	return entry.Verifier, true
}

var xOAuthStateStore = newOAuthStateStore()

func isSecureRequest(r *http.Request) bool {
	if r == nil {
		return false
	}
	if r.TLS != nil {
		return true
	}
	// Common when running behind a reverse proxy.
	if strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https") {
		return true
	}
	return false
}

func randomState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func pkcePair() (verifier string, challenge string, err error) {
	// Verifier length should be 43-128 chars. 32 bytes => 43 chars base64url.
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", err
	}
	verifier = base64.RawURLEncoding.EncodeToString(b)
	h := sha256.Sum256([]byte(verifier))
	challenge = base64.RawURLEncoding.EncodeToString(h[:])
	return verifier, challenge, nil
}

func (h *IntegrationsHandler) Status(c *gin.Context) {
	st, err := h.uc.GetStatus(c.Request.Context())
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, st)
}

func (h *IntegrationsHandler) GoogleConnect(c *gin.Context) {
	state, err := randomState()
	if err != nil {
		response.Err(c, err)
		return
	}

	authURL, err := h.uc.GoogleAuthURL(state)
	if err != nil {
		response.Err(c, err)
		return
	}

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     googleStateCookieName,
		Value:    state,
		Path:     "/",
		MaxAge:   600,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   isSecureRequest(c.Request),
		Expires:  time.Now().Add(10 * time.Minute),
	})

	c.Redirect(http.StatusFound, authURL)
}

func (h *IntegrationsHandler) GoogleCallback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")
	if strings.TrimSpace(code) == "" || strings.TrimSpace(state) == "" {
		response.BadRequest(c, "invalid request")
		return
	}

	cookieState, err := c.Cookie(googleStateCookieName)
	if err != nil || cookieState == "" || cookieState != state {
		response.BadRequest(c, "invalid state")
		return
	}

	if err := h.uc.HandleGoogleCallback(c.Request.Context(), code); err != nil {
		response.Err(c, err)
		return
	}

	// Clear cookie.
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     googleStateCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   isSecureRequest(c.Request),
		Expires:  time.Unix(0, 0),
	})

	if strings.TrimSpace(h.dashboardURL) != "" {
		c.Redirect(http.StatusFound, strings.TrimRight(h.dashboardURL, "/")+"/settings?google=connected")
		return
	}
	response.OK(c, gin.H{"connected": true})
}

func (h *IntegrationsHandler) GoogleDisconnect(c *gin.Context) {
	if err := h.uc.DisconnectGoogle(c.Request.Context()); err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, gin.H{"disconnected": true})
}

func (h *IntegrationsHandler) XConnect(c *gin.Context) {
	state, err := randomState()
	if err != nil {
		response.Err(c, err)
		return
	}

	verifier, challenge, err := pkcePair()
	if err != nil {
		response.Err(c, err)
		return
	}

	// Store verifier server-side so it works even when connect is hit via localhost
	// but callback arrives via ngrok domain.
	xOAuthStateStore.put(state, verifier, 10*time.Minute)

	authURL, err := h.uc.XAuthURL(state, challenge)
	if err != nil {
		response.Err(c, err)
		return
	}

	c.Redirect(http.StatusFound, authURL)
}

func (h *IntegrationsHandler) XCallback(c *gin.Context) {
	if errParam := strings.TrimSpace(c.Query("error")); errParam != "" {
		desc := strings.TrimSpace(c.Query("error_description"))
		if desc != "" {
			response.BadRequest(c, errParam+": "+desc)
			return
		}
		response.BadRequest(c, errParam)
		return
	}

	code := c.Query("code")
	state := c.Query("state")
	if strings.TrimSpace(code) == "" || strings.TrimSpace(state) == "" {
		response.BadRequest(c, "invalid request")
		return
	}

	verifier, ok := xOAuthStateStore.pop(state)
	if !ok {
		response.BadRequest(c, "invalid state")
		return
	}

	if err := h.uc.HandleXCallback(c.Request.Context(), code, verifier); err != nil {
		response.Err(c, err)
		return
	}

	if strings.TrimSpace(h.dashboardURL) != "" {
		c.Redirect(http.StatusFound, strings.TrimRight(h.dashboardURL, "/")+"/settings?x=connected")
		return
	}
	response.OK(c, gin.H{"connected": true})
}

type whatsappUpsertRequest struct {
	PhoneNumberID     string `json:"phone_number_id"`
	BusinessAccountID string `json:"business_account_id"`
	APIToken          string `json:"api_token"`
}

func (h *IntegrationsHandler) WhatsAppUpsert(c *gin.Context) {
	var req whatsappUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.uc.UpsertWhatsApp(c.Request.Context(), req.PhoneNumberID, req.BusinessAccountID, req.APIToken); err != nil {
		response.Err(c, err)
		return
	}

	st, err := h.uc.GetStatus(c.Request.Context())
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, st)
}

func (h *IntegrationsHandler) WhatsAppDisconnect(c *gin.Context) {
	if err := h.uc.DisconnectWhatsApp(c.Request.Context()); err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, gin.H{"disconnected": true})
}

type telegramUpsertRequest struct {
	BotToken string `json:"bot_token"`
}

func (h *IntegrationsHandler) TelegramUpsert(c *gin.Context) {
	var req telegramUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.uc.UpsertTelegram(c.Request.Context(), req.BotToken); err != nil {
		response.Err(c, err)
		return
	}

	st, err := h.uc.GetStatus(c.Request.Context())
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, st)
}

func (h *IntegrationsHandler) TelegramDisconnect(c *gin.Context) {
	if err := h.uc.DisconnectTelegram(c.Request.Context()); err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, gin.H{"disconnected": true})
}

type discordUpsertRequest struct {
	WebhookURL string `json:"webhook_url"`
	BotToken   string `json:"bot_token"`
}

func (h *IntegrationsHandler) DiscordUpsert(c *gin.Context) {
	var req discordUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.uc.UpsertDiscord(c.Request.Context(), req.WebhookURL, req.BotToken); err != nil {
		response.Err(c, err)
		return
	}

	st, err := h.uc.GetStatus(c.Request.Context())
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, st)
}

func (h *IntegrationsHandler) DiscordDisconnect(c *gin.Context) {
	if err := h.uc.DisconnectDiscord(c.Request.Context()); err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, gin.H{"disconnected": true})
}

type xUpsertRequest struct {
	APIKey            string `json:"api_key"`
	APISecret         string `json:"api_secret"`
	AccessToken       string `json:"access_token"`
	AccessTokenSecret string `json:"access_token_secret"`
	BearerToken       string `json:"bearer_token"`
}

func (h *IntegrationsHandler) XUpsert(c *gin.Context) {
	var req xUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.uc.UpsertX(c.Request.Context(), req.APIKey, req.APISecret, req.AccessToken, req.AccessTokenSecret, req.BearerToken); err != nil {
		response.Err(c, err)
		return
	}

	st, err := h.uc.GetStatus(c.Request.Context())
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, st)
}

func (h *IntegrationsHandler) XDisconnect(c *gin.Context) {
	if err := h.uc.DisconnectX(c.Request.Context()); err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, gin.H{"disconnected": true})
}
