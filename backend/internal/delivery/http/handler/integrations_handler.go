package handler

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"strings"
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
