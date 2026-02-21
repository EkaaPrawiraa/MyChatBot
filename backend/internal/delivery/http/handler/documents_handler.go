package handler

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/EkaaPrawiraa/axis-assistant/pkg/apperror"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
)

type DocumentsHandler struct {
	orchestratorURL string
	apiKey          string
	httpClient      *http.Client
}

func NewDocumentsHandler(orchestratorURL, apiKey string) *DocumentsHandler {
	return &DocumentsHandler{
		orchestratorURL: strings.TrimRight(orchestratorURL, "/"),
		apiKey:          apiKey,
		httpClient:      &http.Client{Timeout: 30 * time.Second},
	}
}

type documentsSummarizeRequest struct {
	Title    string `json:"title"`
	Kind     string `json:"kind"`
	Content  string `json:"content"`
	MaxWords int    `json:"max_words"`
}

type documentsSummarizeResp struct {
	Success bool `json:"success"`
	Data    struct {
		Summary   string `json:"summary"`
		LatencyMS int    `json:"latency_ms"`
	} `json:"data"`
	Error *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// Summarize handles POST /api/v1/documents/summarize
func (h *DocumentsHandler) Summarize(c *gin.Context) {
	var reqBody documentsSummarizeRequest
	if err := c.ShouldBindJSON(&reqBody); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if strings.TrimSpace(reqBody.Content) == "" {
		response.BadRequest(c, "content is required")
		return
	}

	if strings.TrimSpace(h.orchestratorURL) == "" {
		response.Err(c, apperror.Validation("AI_ORCHESTRATOR_URL is not configured"))
		return
	}

	payload, _ := json.Marshal(map[string]any{
		"title":     strings.TrimSpace(reqBody.Title),
		"kind":      strings.TrimSpace(reqBody.Kind),
		"content":   reqBody.Content,
		"max_words": reqBody.MaxWords,
	})

	r, err := http.NewRequestWithContext(
		c.Request.Context(),
		http.MethodPost,
		h.orchestratorURL+"/suggest/document-summary",
		bytes.NewReader(payload),
	)
	if err != nil {
		response.Err(c, apperror.Wrap(err, apperror.CodeInternal, "failed to create request", http.StatusInternalServerError))
		return
	}
	r.Header.Set("Content-Type", "application/json")
	r.Header.Set("X-API-Key", h.apiKey)

	resp, err := h.httpClient.Do(r)
	if err != nil {
		response.Err(c, apperror.AgentError(err, "orchestrator unreachable"))
		return
	}
	defer resp.Body.Close()

	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		response.Err(c, apperror.New(apperror.CodeAgentError, "orchestrator error: "+string(b), http.StatusBadGateway))
		return
	}

	var parsed documentsSummarizeResp
	if err := json.Unmarshal(b, &parsed); err != nil {
		response.Err(c, apperror.Wrap(err, apperror.CodeAgentError, "failed to decode orchestrator response", http.StatusBadGateway))
		return
	}
	if !parsed.Success && parsed.Error != nil {
		response.Err(c, apperror.New(apperror.CodeAgentError, parsed.Error.Message, http.StatusBadGateway))
		return
	}

	response.OK(c, gin.H{
		"summary":    strings.TrimSpace(parsed.Data.Summary),
		"latency_ms": parsed.Data.LatencyMS,
	})
}
