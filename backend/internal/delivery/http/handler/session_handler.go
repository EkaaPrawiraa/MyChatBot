package handler

import (
	"strconv"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
)

type SessionHandler struct {
	uc domain.SessionUsecase
}

func NewSessionHandler(uc domain.SessionUsecase) *SessionHandler {
	return &SessionHandler{uc: uc}
}

// Create handles POST /api/v1/sessions
func (h *SessionHandler) Create(c *gin.Context) {
	session, err := h.uc.Create(c.Request.Context())
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
