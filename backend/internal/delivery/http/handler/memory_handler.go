package handler

import (
	"strconv"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
)

type MemoryHandler struct {
	uc domain.MemoryUsecase
}

func NewMemoryHandler(uc domain.MemoryUsecase) *MemoryHandler {
	return &MemoryHandler{uc: uc}
}

// SearchMemory handles GET /api/v1/memory/search?q=...&limit=10
func (h *MemoryHandler) SearchMemory(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		response.BadRequest(c, "query parameter 'q' required")
		return
	}

	limit := 10
	if v := c.Query("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	memories, err := h.uc.SearchMemory(c.Request.Context(), q, limit)
	if err != nil {
		mapDomainError(c, err)
		return
	}
	response.OK(c, memories)
}

// GetRecent handles GET /api/v1/memory/recent?limit=20
func (h *MemoryHandler) GetRecent(c *gin.Context) {
	limit := 20
	if v := c.Query("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	memories, err := h.uc.GetRecentMemories(c.Request.Context(), limit)
	if err != nil {
		mapDomainError(c, err)
		return
	}
	response.OK(c, memories)
}

// ---------- Internal endpoints (agent → backend) ----------

// StoreShortTerm handles POST /api/v1/internal/memory/short-term
func (h *MemoryHandler) StoreShortTerm(c *gin.Context) {
	var mem domain.ShortTermMemory
	if err := c.ShouldBindJSON(&mem); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if err := h.uc.StoreShortTerm(c.Request.Context(), &mem); err != nil {
		mapDomainError(c, err)
		return
	}
	response.Created(c, mem)
}

// GetConversation handles GET /api/v1/internal/memory/short-term/:session_id?limit=50
func (h *MemoryHandler) GetConversation(c *gin.Context) {
	sessionID, ok := parseUUID(c, "session_id")
	if !ok {
		return
	}

	limit := 50
	if v := c.Query("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	msgs, err := h.uc.GetConversation(c.Request.Context(), sessionID, limit)
	if err != nil {
		mapDomainError(c, err)
		return
	}
	response.OK(c, msgs)
}

// StoreLongTerm handles POST /api/v1/internal/memory/long-term
func (h *MemoryHandler) StoreLongTerm(c *gin.Context) {
	var mem domain.LongTermMemory
	if err := c.ShouldBindJSON(&mem); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if err := h.uc.StoreLongTerm(c.Request.Context(), &mem); err != nil {
		mapDomainError(c, err)
		return
	}
	response.Created(c, mem)
}

// VectorSearch handles POST /api/v1/internal/memory/search
type vectorSearchRequest struct {
	Query string `json:"query" binding:"required"`
	Limit int    `json:"limit"`
}

func (h *MemoryHandler) VectorSearch(c *gin.Context) {
	var req vectorSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if req.Limit <= 0 {
		req.Limit = 10
	}

	memories, err := h.uc.SearchMemory(c.Request.Context(), req.Query, req.Limit)
	if err != nil {
		mapDomainError(c, err)
		return
	}
	response.OK(c, memories)
}
