package handler

import (
	"encoding/json"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
)

type AutomationHandler struct {
	uc domain.AutomationUsecase
}

func NewAutomationHandler(uc domain.AutomationUsecase) *AutomationHandler {
	return &AutomationHandler{uc: uc}
}

type createAutomationRequest struct {
	Name          string `json:"name" binding:"required"`
	TriggerType   string `json:"trigger_type" binding:"required"`
	ConditionJSON json.RawMessage `json:"condition_json"`
	ActionJSON    json.RawMessage `json:"action_json"`
	Enabled       *bool  `json:"enabled"`
}

// Create handles POST /api/v1/automations
func (h *AutomationHandler) Create(c *gin.Context) {
	var req createAutomationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	rule := &domain.AutomationRule{
		Name:          req.Name,
		TriggerType:   req.TriggerType,
		ConditionJSON: req.ConditionJSON,
		ActionJSON:    req.ActionJSON,
		Enabled:       enabled,
	}

	if err := h.uc.Create(c.Request.Context(), rule); err != nil {
		mapDomainError(c, err)
		return
	}
	response.Created(c, rule)
}

// List handles GET /api/v1/automations
func (h *AutomationHandler) List(c *gin.Context) {
	rules, err := h.uc.List(c.Request.Context())
	if err != nil {
		mapDomainError(c, err)
		return
	}
	response.OK(c, rules)
}

type updateAutomationRequest struct {
	Name          *string `json:"name"`
	TriggerType   *string `json:"trigger_type"`
	ConditionJSON json.RawMessage `json:"condition_json"`
	ActionJSON    json.RawMessage `json:"action_json"`
	Enabled       *bool   `json:"enabled"`
}

// Update handles PUT /api/v1/automations/:id
func (h *AutomationHandler) Update(c *gin.Context) {
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}

	var req updateAutomationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	rule := &domain.AutomationRule{ID: id}
	if req.Name != nil {
		rule.Name = *req.Name
	}
	if req.TriggerType != nil {
		rule.TriggerType = *req.TriggerType
	}
	if len(req.ConditionJSON) > 0 {
		rule.ConditionJSON = req.ConditionJSON
	}
	if len(req.ActionJSON) > 0 {
		rule.ActionJSON = req.ActionJSON
	}
	if req.Enabled != nil {
		rule.Enabled = *req.Enabled
	}

	if err := h.uc.Update(c.Request.Context(), rule); err != nil {
		mapDomainError(c, err)
		return
	}
	response.OK(c, rule)
}

// Delete handles DELETE /api/v1/automations/:id
func (h *AutomationHandler) Delete(c *gin.Context) {
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
