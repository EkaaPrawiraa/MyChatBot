package handler

import (
	"encoding/json"

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
	var req struct {
		ID               uuid.UUID       `json:"id"`
		SessionID        uuid.UUID       `json:"session_id"`
		UserQuery        string          `json:"user_query"`
		Intent           string          `json:"intent"`
		ExecutionPlan    json.RawMessage `json:"execution_plan"`
		ToolsUsed        json.RawMessage `json:"tools_used"`
		ExecutionResults json.RawMessage `json:"execution_results"`
		Success          bool            `json:"success"`
		ErrorMessage     string          `json:"error_message"`
		LatencyMs        int             `json:"latency_ms"`
		TokenUsage       int             `json:"token_usage"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	log := domain.ActivityLog{
		ID:               req.ID,
		SessionID:        req.SessionID,
		UserQuery:        req.UserQuery,
		Intent:           req.Intent,
		ExecutionPlan:    []byte(req.ExecutionPlan),
		ToolsUsed:        []byte(req.ToolsUsed),
		ExecutionResults: []byte(req.ExecutionResults),
		Success:          req.Success,
		ErrorMessage:     req.ErrorMessage,
		LatencyMs:        req.LatencyMs,
		TokenUsage:       req.TokenUsage,
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
	var req struct {
		ID           uuid.UUID       `json:"id"`
		SessionID    uuid.UUID       `json:"session_id" binding:"required"`
		ProposedPlan json.RawMessage `json:"proposed_plan"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	item := domain.ApprovalItem{
		ID:           req.ID,
		SessionID:    req.SessionID,
		ProposedPlan: []byte(req.ProposedPlan),
		Status:       "pending",
	}
	if item.ID == uuid.Nil {
		item.ID = uuid.New()
	}
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
	// Internal endpoint is protected by API_KEY and may include sensitive fields
	// required for agent execution.
	type internalProfileResponse struct {
		*domain.OwnerProfile
		AIAPIKey     string          `json:"ai_api_key"`
		AISkill      string          `json:"ai_skill"`
		SidebarMenus map[string]bool `json:"sidebar_menus"`
	}
	response.OK(c, internalProfileResponse{
		OwnerProfile: profile,
		AIAPIKey:     profile.AIAPIKey,
		AISkill:      getAISkillFromPreferences(profile.Preferences),
		SidebarMenus: getSidebarMenusFromPreferences(profile.Preferences),
	})
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
