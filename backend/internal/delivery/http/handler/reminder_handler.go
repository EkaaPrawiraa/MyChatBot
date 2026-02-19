package handler

import (
	"strconv"
	"time"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
)

type ReminderHandler struct {
	uc domain.ReminderUsecase
}

func NewReminderHandler(uc domain.ReminderUsecase) *ReminderHandler {
	return &ReminderHandler{uc: uc}
}

type createReminderRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	ScheduledAt string `json:"scheduled_at" binding:"required"` // RFC3339
	SentVia     string `json:"sent_via"`
}

// Create handles POST /api/v1/reminders
func (h *ReminderHandler) Create(c *gin.Context) {
	var req createReminderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	scheduledAt, err := time.Parse(time.RFC3339, req.ScheduledAt)
	if err != nil {
		response.BadRequest(c, "scheduled_at must be RFC3339 format")
		return
	}

	reminder := &domain.Reminder{
		Title:       req.Title,
		Description: req.Description,
		ScheduledAt: scheduledAt,
		SentVia:     req.SentVia,
	}

	if err := h.uc.Create(c.Request.Context(), reminder); err != nil {
		mapDomainError(c, err)
		return
	}
	response.Created(c, reminder)
}

// List handles GET /api/v1/reminders?limit=20
func (h *ReminderHandler) List(c *gin.Context) {
	limit := 20
	if v := c.Query("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	reminders, err := h.uc.GetUpcoming(c.Request.Context(), limit)
	if err != nil {
		mapDomainError(c, err)
		return
	}
	response.OK(c, reminders)
}
