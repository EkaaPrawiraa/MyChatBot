package handler

import (
	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
)

type ApprovalHandler struct {
	uc domain.ApprovalUsecase
}

func NewApprovalHandler(uc domain.ApprovalUsecase) *ApprovalHandler {
	return &ApprovalHandler{uc: uc}
}

// GetPending handles GET /api/v1/approvals
func (h *ApprovalHandler) GetPending(c *gin.Context) {
	items, err := h.uc.GetPending(c.Request.Context())
	if err != nil {
		mapDomainError(c, err)
		return
	}
	response.OK(c, items)
}

type resolveApprovalRequest struct {
	Feedback     string `json:"feedback"`
	ModifiedPlan []byte `json:"modified_plan,omitempty"`
}

// Approve handles POST /api/v1/approvals/:id/approve
func (h *ApprovalHandler) Approve(c *gin.Context) {
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}

	var req resolveApprovalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.uc.Approve(c.Request.Context(), id, req.Feedback, req.ModifiedPlan); err != nil {
		mapDomainError(c, err)
		return
	}
	response.OK(c, gin.H{"status": "approved"})
}

// Reject handles POST /api/v1/approvals/:id/reject
func (h *ApprovalHandler) Reject(c *gin.Context) {
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}

	var req resolveApprovalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.uc.Reject(c.Request.Context(), id, req.Feedback); err != nil {
		mapDomainError(c, err)
		return
	}
	response.OK(c, gin.H{"status": "rejected"})
}
