package handler

import (
	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
)

type ChatHandler struct {
	uc domain.ChatUsecase
}

func NewChatHandler(uc domain.ChatUsecase) *ChatHandler {
	return &ChatHandler{uc: uc}
}

type sendMessageRequest struct {
	SessionID string `json:"session_id" binding:"required"`
	Message   string `json:"message" binding:"required"`
}

// SendMessage handles POST /api/v1/chat
func (h *ChatHandler) SendMessage(c *gin.Context) {
	var req sendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	sessionID, err := parseUUIDString(req.SessionID)
	if err != nil {
		response.BadRequest(c, "invalid session_id")
		return
	}

	resp, err := h.uc.SendMessage(c.Request.Context(), sessionID, req.Message)
	if err != nil {
		mapDomainError(c, err)
		return
	}

	response.OK(c, resp)
}
