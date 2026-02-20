package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/EkaaPrawiraa/axis-assistant/pkg/apperror"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
)

type WhatsAppWebHandler struct {
	botURL     string
	httpClient *http.Client
}

func NewWhatsAppWebHandler(botURL string) *WhatsAppWebHandler {
	return &WhatsAppWebHandler{
		botURL:     strings.TrimRight(botURL, "/"),
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

func (h *WhatsAppWebHandler) Status(c *gin.Context) {
	if strings.TrimSpace(h.botURL) == "" {
		response.Err(c, apperror.Validation("WHATSAPP_BOT_URL is not configured"))
		return
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, h.botURL+"/status", nil)
	if err != nil {
		response.Err(c, apperror.Wrap(err, apperror.CodeInternal, "failed to create request", http.StatusInternalServerError))
		return
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		response.Err(c, apperror.ExternalError(err, "whatsapp bot request failed"))
		return
	}
	defer resp.Body.Close()

	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		response.Err(c, apperror.ExternalError(
			apperror.New(apperror.CodeExternalError, string(b), http.StatusBadGateway),
			"whatsapp bot returned error",
		))
		return
	}

	var parsed any
	if err := json.Unmarshal(b, &parsed); err != nil {
		response.Err(c, apperror.ExternalError(err, "failed to decode whatsapp bot response"))
		return
	}
	response.OK(c, parsed)
}

func (h *WhatsAppWebHandler) QRPNG(c *gin.Context) {
	if strings.TrimSpace(h.botURL) == "" {
		response.Err(c, apperror.Validation("WHATSAPP_BOT_URL is not configured"))
		return
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, h.botURL+"/qr.png", nil)
	if err != nil {
		response.Err(c, apperror.Wrap(err, apperror.CodeInternal, "failed to create request", http.StatusInternalServerError))
		return
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		response.Err(c, apperror.ExternalError(err, "whatsapp bot request failed"))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNoContent {
		c.Status(http.StatusNoContent)
		return
	}

	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		response.Err(c, apperror.ExternalError(
			apperror.New(apperror.CodeExternalError, string(b), http.StatusBadGateway),
			"whatsapp bot returned error",
		))
		return
	}

	c.Header("Cache-Control", "no-store")
	c.Data(http.StatusOK, "image/png", b)
}

func (h *WhatsAppWebHandler) Logout(c *gin.Context) {
	if strings.TrimSpace(h.botURL) == "" {
		response.Err(c, apperror.Validation("WHATSAPP_BOT_URL is not configured"))
		return
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodPost, h.botURL+"/logout", nil)
	if err != nil {
		response.Err(c, apperror.Wrap(err, apperror.CodeInternal, "failed to create request", http.StatusInternalServerError))
		return
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		response.Err(c, apperror.ExternalError(err, "whatsapp bot request failed"))
		return
	}
	defer resp.Body.Close()

	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		response.Err(c, apperror.ExternalError(
			apperror.New(apperror.CodeExternalError, string(b), http.StatusBadGateway),
			"whatsapp bot returned error",
		))
		return
	}

	var parsed any
	if len(b) > 0 {
		if err := json.Unmarshal(b, &parsed); err != nil {
			response.Err(c, apperror.ExternalError(err, "failed to decode whatsapp bot response"))
			return
		}
	}
	if parsed == nil {
		parsed = map[string]any{"ok": true}
	}
	response.OK(c, parsed)
}
