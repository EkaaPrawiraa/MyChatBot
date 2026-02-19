package handler

import (
	"strconv"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
)

type ActivityHandler struct {
	uc domain.ActivityUsecase
}

func NewActivityHandler(uc domain.ActivityUsecase) *ActivityHandler {
	return &ActivityHandler{uc: uc}
}

// List handles GET /api/v1/activities?limit=20&offset=0
func (h *ActivityHandler) List(c *gin.Context) {
	limit := 20
	offset := 0
	if v := c.Query("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if v := c.Query("offset"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	logs, err := h.uc.GetLogs(c.Request.Context(), limit, offset)
	if err != nil {
		mapDomainError(c, err)
		return
	}
	response.OK(c, logs)
}
