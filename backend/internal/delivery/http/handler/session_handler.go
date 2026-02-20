package handler

import (
	"io"
	"strconv"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
)

type SessionHandler struct {
	uc      domain.SessionUsecase
	memoryU domain.MemoryUsecase
}

func NewSessionHandler(uc domain.SessionUsecase, memoryU domain.MemoryUsecase) *SessionHandler {
	return &SessionHandler{uc: uc, memoryU: memoryU}
}

type createSessionRequest struct {
	Title string `json:"title"`
}

// Create handles POST /api/v1/sessions
func (h *SessionHandler) Create(c *gin.Context) {
	var req createSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Empty body is allowed.
		if err != io.EOF {
			response.BadRequest(c, err.Error())
			return
		}
	}

	session, err := h.uc.Create(c.Request.Context(), req.Title)
	if err != nil {
		mapDomainError(c, err)
		return
	}
	response.Created(c, session)
}

// GetByID handles GET /api/v1/sessions/:id
func (h *SessionHandler) GetByID(c *gin.Context) {
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}

	session, err := h.uc.GetByID(c.Request.Context(), id)
	if err != nil {
		mapDomainError(c, err)
		return
	}
	response.OK(c, session)
}

// List handles GET /api/v1/sessions?limit=20
func (h *SessionHandler) List(c *gin.Context) {
	limit := 20
	if v := c.Query("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	sessions, err := h.uc.List(c.Request.Context(), limit)
	if err != nil {
		mapDomainError(c, err)
		return
	}
	response.OK(c, sessions)
}

// GetMessages handles GET /api/v1/sessions/:id/messages?limit=200
//
// This returns the short-term conversation memory for a session so the
// dashboard can render prior messages (ChatGPT-style history).
func (h *SessionHandler) GetMessages(c *gin.Context) {
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}

	limit := 200
	if v := c.Query("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	msgs, err := h.memoryU.GetConversation(c.Request.Context(), id, limit)
	if err != nil {
		mapDomainError(c, err)
		return
	}
	response.OK(c, msgs)
}

// Close handles POST /api/v1/sessions/:id/close
func (h *SessionHandler) Close(c *gin.Context) {
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}

	if err := h.uc.Close(c.Request.Context(), id); err != nil {
		mapDomainError(c, err)
		return
	}
	response.NoContent(c)
}

// Delete handles DELETE /api/v1/sessions/:id
//
// Deleting a session will also delete its short-term conversation history
// due to FK constraints (ON DELETE CASCADE).
func (h *SessionHandler) Delete(c *gin.Context) {
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}

	if err := h.uc.Delete(c.Request.Context(), id); err != nil {
		mapDomainError(c, err)
		return
	}
	response.NoContent(c)
}
