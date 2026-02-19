package handler

import (
	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// InternalHandler groups endpoints that the Python agent calls.
type InternalHandler struct {
	activityRepo domain.ActivityLogRepository
	approvalRepo domain.ApprovalRepository
	profileUC    domain.ProfileUsecase
	reminderUC   domain.ReminderUsecase
}

func NewInternalHandler(
	activityRepo domain.ActivityLogRepository,
	approvalRepo domain.ApprovalRepository,
	profileUC domain.ProfileUsecase,
	reminderUC domain.ReminderUsecase,
) *InternalHandler {
	return &InternalHandler{
		activityRepo: activityRepo,
		approvalRepo: approvalRepo,
		profileUC:    profileUC,
		reminderUC:   reminderUC,
	}
}

// LogActivity handles POST /api/v1/internal/activity
func (h *InternalHandler) LogActivity(c *gin.Context) {
	var log domain.ActivityLog
	if err := c.ShouldBindJSON(&log); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if log.ID == uuid.Nil {
		log.ID = uuid.New()
	}
	if err := h.activityRepo.Create(c.Request.Context(), &log); err != nil {
		response.Internal(c, "failed to log activity")
		return
	}
	response.Created(c, log)
}

// CreateApproval handles POST /api/v1/internal/approval
func (h *InternalHandler) CreateApproval(c *gin.Context) {
	var item domain.ApprovalItem
	if err := c.ShouldBindJSON(&item); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if item.ID == uuid.Nil {
		item.ID = uuid.New()
	}
	item.Status = "pending"
	if err := h.approvalRepo.Create(c.Request.Context(), &item); err != nil {
		response.Internal(c, "failed to create approval")
		return
	}
	response.Created(c, item)
}

// GetApproval handles GET /api/v1/internal/approval/:id
func (h *InternalHandler) GetApproval(c *gin.Context) {
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}
	item, err := h.approvalRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		mapDomainError(c, err)
		return
	}
	response.OK(c, item)
}

// GetProfile handles GET /api/v1/internal/profile
func (h *InternalHandler) GetProfile(c *gin.Context) {
	profile, err := h.profileUC.GetProfile(c.Request.Context())
	if err != nil {
		mapDomainError(c, err)
		return
	}
	response.OK(c, profile)
}

// CreateReminder handles POST /api/v1/internal/reminder
func (h *InternalHandler) CreateReminder(c *gin.Context) {
	var reminder domain.Reminder
	if err := c.ShouldBindJSON(&reminder); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if err := h.reminderUC.Create(c.Request.Context(), &reminder); err != nil {
		mapDomainError(c, err)
		return
	}
	response.Created(c, reminder)
}
