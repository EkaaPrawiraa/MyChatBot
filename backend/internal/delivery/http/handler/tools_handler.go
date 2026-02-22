package handler

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ToolsHandler struct {
	uc           domain.ToolsUsecase
	activityRepo domain.ActivityLogRepository
}

func NewToolsHandler(uc domain.ToolsUsecase, activityRepo domain.ActivityLogRepository) *ToolsHandler {
	return &ToolsHandler{uc: uc, activityRepo: activityRepo}
}

func parseIntQuery(c *gin.Context, key string, def int) int {
	v := c.Query(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		return def
	}
	return n
}

func (h *ToolsHandler) GmailUnread(c *gin.Context) {
	maxResults := parseIntQuery(c, "maxResults", 50)
	count, err := h.uc.GmailUnread(c.Request.Context(), maxResults)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, gin.H{"unread": count})
}

func (h *ToolsHandler) GmailSearch(c *gin.Context) {
	query := c.Query("q")
	maxResults := parseIntQuery(c, "maxResults", 10)
	data, err := h.uc.GmailSearch(c.Request.Context(), query, maxResults)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

func (h *ToolsHandler) GmailCategorizedUnread(c *gin.Context) {
	maxResults := parseIntQuery(c, "maxResults", 10)
	data, err := h.uc.GmailCategorizedUnread(c.Request.Context(), maxResults)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

type gmailSendRequest struct {
	To      string `json:"to"`
	Subject string `json:"subject"`
	Body    string `json:"body"`
}

func (h *ToolsHandler) GmailSend(c *gin.Context) {
	var req gmailSendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	data, err := h.uc.GmailSend(c.Request.Context(), req.To, req.Subject, req.Body)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

func (h *ToolsHandler) CalendarList(c *gin.Context) {
	timeMin := c.Query("timeMin")
	timeMax := c.Query("timeMax")
	maxResults := parseIntQuery(c, "maxResults", 20)

	data, err := h.uc.CalendarList(c.Request.Context(), timeMin, timeMax, maxResults)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

func (h *ToolsHandler) CalendarCreate(c *gin.Context) {
	var payload map[string]any
	if err := c.ShouldBindJSON(&payload); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	data, err := h.uc.CalendarCreate(c.Request.Context(), payload)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

func (h *ToolsHandler) CalendarUpdate(c *gin.Context) {
	eventID := c.Param("eventId")
	var payload map[string]any
	if err := c.ShouldBindJSON(&payload); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	data, err := h.uc.CalendarUpdate(c.Request.Context(), eventID, payload)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

func (h *ToolsHandler) CalendarDelete(c *gin.Context) {
	eventID := c.Param("eventId")
	data, err := h.uc.CalendarDelete(c.Request.Context(), eventID)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

func (h *ToolsHandler) CalendarFreeBusy(c *gin.Context) {
	var payload struct {
		TimeMin string `json:"timeMin"`
		TimeMax string `json:"timeMax"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	data, err := h.uc.CalendarFreeBusy(c.Request.Context(), payload.TimeMin, payload.TimeMax)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

func (h *ToolsHandler) PeopleSearch(c *gin.Context) {
	query := c.Query("q")
	pageToken := c.Query("pageToken")
	pageSize := parseIntQuery(c, "pageSize", 10)
	data, err := h.uc.PeopleSearch(c.Request.Context(), query, pageSize, pageToken)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

func (h *ToolsHandler) DriveSearch(c *gin.Context) {
	query := c.Query("q")
	pageToken := c.Query("pageToken")
	pageSize := parseIntQuery(c, "pageSize", 10)
	data, err := h.uc.DriveSearch(c.Request.Context(), query, pageSize, pageToken)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

func (h *ToolsHandler) DriveExport(c *gin.Context) {
	fileID := c.Query("fileId")
	if fileID == "" {
		fileID = c.Query("file_id")
	}
	mimeType := c.Query("mimeType")
	if mimeType == "" {
		mimeType = c.Query("mime_type")
	}
	maxBytes := parseIntQuery(c, "maxBytes", 20000)
	data, err := h.uc.DriveExport(c.Request.Context(), fileID, mimeType, maxBytes)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

type driveCreateTextFileRequest struct {
	Name     string `json:"name"`
	Content  string `json:"content"`
	MimeType string `json:"mime_type"`
	ParentID string `json:"parent_id"`
}

func (h *ToolsHandler) DriveCreateTextFile(c *gin.Context) {
	var req driveCreateTextFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	data, err := h.uc.DriveCreateTextFile(c.Request.Context(), req.Name, req.Content, req.MimeType, req.ParentID)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

type driveCreateGoogleDocRequest struct {
	Name     string `json:"name"`
	Content  string `json:"content"`
	ParentID string `json:"parent_id"`
}

func (h *ToolsHandler) DriveCreateGoogleDoc(c *gin.Context) {
	var req driveCreateGoogleDocRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	data, err := h.uc.DriveCreateGoogleDoc(c.Request.Context(), req.Name, req.Content, req.ParentID)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

type driveCreateGoogleSheetRequest struct {
	Name     string `json:"name"`
	CSV      string `json:"csv"`
	ParentID string `json:"parent_id"`
}

func (h *ToolsHandler) DriveCreateGoogleSheet(c *gin.Context) {
	var req driveCreateGoogleSheetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	data, err := h.uc.DriveCreateGoogleSheet(c.Request.Context(), req.Name, req.CSV, req.ParentID)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

func (h *ToolsHandler) YouTubeAnalytics(c *gin.Context) {
	startDate := c.Query("startDate")
	endDate := c.Query("endDate")
	data, err := h.uc.YouTubeAnalytics(c.Request.Context(), startDate, endDate)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

func (h *ToolsHandler) WebSearch(c *gin.Context) {
	query := c.Query("q")
	maxResults := parseIntQuery(c, "maxResults", 5)
	data, err := h.uc.WebSearch(c.Request.Context(), query, maxResults)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

func (h *ToolsHandler) WebFetch(c *gin.Context) {
	pageURL := c.Query("url")
	maxBytes := parseIntQuery(c, "maxBytes", 200000)
	data, err := h.uc.WebFetch(c.Request.Context(), pageURL, maxBytes)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

type whatsappSendRequest struct {
	To      string `json:"to"`
	Message string `json:"message"`
}

func (h *ToolsHandler) WhatsAppSend(c *gin.Context) {
	start := time.Now()
	var req whatsappSendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	data, err := h.uc.WhatsAppSend(c.Request.Context(), req.To, req.Message)

	// Best-effort activity log (do not fail the request if logging fails)
	if h.activityRepo != nil {
		latency := int(time.Since(start).Milliseconds())
		success := err == nil
		errMsg := ""
		if err != nil {
			errMsg = err.Error()
		}
		toolsUsed, _ := json.Marshal([]string{"whatsapp.send"})
		results, _ := json.Marshal(map[string]any{
			"to":      req.To,
			"message": req.Message,
			"result":  data,
			"error":   errMsg,
		})
		_ = h.activityRepo.Create(c.Request.Context(), &domain.ActivityLog{
			ID:               uuid.New(),
			SessionID:        uuid.Nil, // stored as NULL by repo
			UserQuery:        fmt.Sprintf("whatsapp.send to %s", req.To),
			Intent:           "whatsapp.send",
			ExecutionPlan:    []byte("[]"),
			ToolsUsed:        toolsUsed,
			ExecutionResults: results,
			Success:          success,
			ErrorMessage:     errMsg,
			LatencyMs:        latency,
			TokenUsage:       0,
		})
	}

	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

type telegramSendRequest struct {
	ChatID  string `json:"chat_id"`
	Message string `json:"message"`
}

func (h *ToolsHandler) TelegramSend(c *gin.Context) {
	var req telegramSendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	data, err := h.uc.TelegramSend(c.Request.Context(), req.ChatID, req.Message)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

func (h *ToolsHandler) TelegramUpdates(c *gin.Context) {
	offset := parseIntQuery(c, "offset", 0)
	limit := parseIntQuery(c, "limit", 50)
	timeoutSeconds := parseIntQuery(c, "timeout", 0)
	data, err := h.uc.TelegramUpdates(c.Request.Context(), offset, limit, timeoutSeconds)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

type discordWebhookSendRequest struct {
	Content  string `json:"content"`
	Username string `json:"username"`
}

func (h *ToolsHandler) DiscordWebhookSend(c *gin.Context) {
	var req discordWebhookSendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	data, err := h.uc.DiscordWebhookSend(c.Request.Context(), req.Content, req.Username)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

func (h *ToolsHandler) XMe(c *gin.Context) {
	data, err := h.uc.XMe(c.Request.Context())
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

func (h *ToolsHandler) XMyTweets(c *gin.Context) {
	limit := parseIntQuery(c, "limit", 10)
	data, err := h.uc.XMyTweets(c.Request.Context(), limit)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

func (h *ToolsHandler) XSearch(c *gin.Context) {
	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		query = strings.TrimSpace(c.Query("query"))
	}
	maxResults := parseIntQuery(c, "maxResults", 10)
	if maxResults == 10 {
		// Also accept snake_case.
		maxResults = parseIntQuery(c, "max_results", 10)
	}
	data, err := h.uc.XSearch(c.Request.Context(), query, maxResults)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

type xTweetRequest struct {
	Text string `json:"text"`
}

func (h *ToolsHandler) XTweet(c *gin.Context) {
	var req xTweetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	data, err := h.uc.XTweet(c.Request.Context(), req.Text)
	if err != nil {
		response.Err(c, err)
		return
	}
	response.OK(c, data)
}

type whatsappInboundRequest struct {
	From      string `json:"from"`
	Message   string `json:"message"`
	MessageID string `json:"message_id"`
	Timestamp int64  `json:"timestamp"`
}

// WhatsAppInbound handles POST /api/v1/internal/tools/whatsapp/inbound
// This is called by the local Node WhatsApp bot to record inbound messages.
func (h *ToolsHandler) WhatsAppInbound(c *gin.Context) {
	var req whatsappInboundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	// Store inbound message into in-memory inbox (best-effort).
	whatsappInbox.addInbound(req.From, req.Message, req.MessageID, req.Timestamp)
	if h.activityRepo == nil {
		response.OK(c, gin.H{"ok": true})
		return
	}

	toolsUsed, _ := json.Marshal([]string{"whatsapp.receive"})
	results, _ := json.Marshal(map[string]any{
		"from":       req.From,
		"message":    req.Message,
		"message_id": req.MessageID,
		"timestamp":  req.Timestamp,
	})
	_ = h.activityRepo.Create(c.Request.Context(), &domain.ActivityLog{
		ID:               uuid.New(),
		SessionID:        uuid.Nil, // stored as NULL by repo
		UserQuery:        fmt.Sprintf("whatsapp.receive from %s", req.From),
		Intent:           "whatsapp.receive",
		ExecutionPlan:    []byte("[]"),
		ToolsUsed:        toolsUsed,
		ExecutionResults: results,
		Success:          true,
		ErrorMessage:     "",
		LatencyMs:        0,
		TokenUsage:       0,
	})

	response.OK(c, gin.H{"ok": true})
}
