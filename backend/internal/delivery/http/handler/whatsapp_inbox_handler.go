package handler

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/apperror"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type waInboxMessage struct {
	ID            string     `json:"id"`
	FromJID        string     `json:"from_jid"`
	FromPhone      string     `json:"from_phone"`
	ContactName    string     `json:"contact_name,omitempty"`
	Message        string     `json:"message"`
	Timestamp      int64      `json:"timestamp"`
	SuggestedReply string     `json:"suggested_reply,omitempty"`
	SuggestedAt    *time.Time `json:"suggested_at,omitempty"`
	SentReply      string     `json:"sent_reply,omitempty"`
	SentAt         *time.Time `json:"sent_at,omitempty"`
}

type waInboxStore struct {
	mu      sync.RWMutex
	maxSize int
	items   []*waInboxMessage
	byID    map[string]*waInboxMessage
	byKey   map[string]string // fromJID|messageID -> id
}

func newWAInboxStore(maxSize int) *waInboxStore {
	if maxSize <= 0 {
		maxSize = 200
	}
	return &waInboxStore{
		maxSize: maxSize,
		items:   make([]*waInboxMessage, 0, maxSize),
		byID:    make(map[string]*waInboxMessage),
		byKey:   make(map[string]string),
	}
}

func (s *waInboxStore) addInbound(fromJID, message, messageID string, ts int64) {
	fromJID = strings.TrimSpace(fromJID)
	message = strings.TrimSpace(message)
	messageID = strings.TrimSpace(messageID)
	if fromJID == "" || message == "" {
		return
	}
	// Ignore group chats for MVP.
	if strings.Contains(fromJID, "@g.us") {
		return
	}

	key := fromJID + "|" + messageID

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.byKey[key]; ok {
		return
	}

	id := uuid.NewString()
	msg := &waInboxMessage{
		ID:       id,
		FromJID:   fromJID,
		FromPhone: extractPhoneFromJID(fromJID),
		Message:   message,
		Timestamp: ts,
	}

	s.items = append([]*waInboxMessage{msg}, s.items...) // newest first
	s.byID[id] = msg
	s.byKey[key] = id

	if len(s.items) > s.maxSize {
		// Evict oldest
		old := s.items[len(s.items)-1]
		s.items = s.items[:len(s.items)-1]
		delete(s.byID, old.ID)
		// byKey is best-effort; leave it to avoid re-adding duplicates.
	}
}

func (s *waInboxStore) list() []*waInboxMessage {
	s.mu.RLock()
	defer s.mu.RUnlock()

	res := make([]*waInboxMessage, 0, len(s.items))
	for _, it := range s.items {
		cpy := *it
		res = append(res, &cpy)
	}
	return res
}

func (s *waInboxStore) get(id string) (*waInboxMessage, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	it, ok := s.byID[id]
	if !ok {
		return nil, false
	}
	cpy := *it
	return &cpy, true
}

func (s *waInboxStore) setSuggestion(id, contactName, reply string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	it, ok := s.byID[id]
	if !ok {
		return
	}
	if strings.TrimSpace(contactName) != "" {
		it.ContactName = strings.TrimSpace(contactName)
	}
	it.SuggestedReply = strings.TrimSpace(reply)
	now := time.Now().UTC()
	it.SuggestedAt = &now
}

func (s *waInboxStore) markSent(id, sentReply string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	it, ok := s.byID[id]
	if !ok {
		return
	}
	it.SentReply = strings.TrimSpace(sentReply)
	now := time.Now().UTC()
	it.SentAt = &now
}

func extractPhoneFromJID(jid string) string {
	jid = strings.TrimSpace(jid)
	if jid == "" {
		return ""
	}
	jid = strings.TrimSuffix(jid, "@s.whatsapp.net")
	jid = strings.TrimSuffix(jid, "@g.us")
	// Keep digits only
	b := strings.Builder{}
	for _, r := range jid {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// Package-level store (MVP). This is intentionally in-memory.
var whatsappInbox = newWAInboxStore(200)

type WhatsAppInboxHandler struct {
	toolsUC         domain.ToolsUsecase
	orchestratorURL string
	apiKey          string
	httpClient      *http.Client
}

func NewWhatsAppInboxHandler(toolsUC domain.ToolsUsecase, orchestratorURL, apiKey string) *WhatsAppInboxHandler {
	return &WhatsAppInboxHandler{
		toolsUC:         toolsUC,
		orchestratorURL: strings.TrimRight(orchestratorURL, "/"),
		apiKey:          apiKey,
		httpClient:      &http.Client{Timeout: 30 * time.Second},
	}
}

// List handles GET /api/v1/whatsapp/inbox
func (h *WhatsAppInboxHandler) List(c *gin.Context) {
	response.OK(c, gin.H{"messages": whatsappInbox.list()})
}

type waSuggestResp struct {
	Success bool `json:"success"`
	Data    struct {
		Reply string `json:"reply"`
	} `json:"data"`
	Error *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// Suggest handles POST /api/v1/whatsapp/inbox/:id/suggest
func (h *WhatsAppInboxHandler) Suggest(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	msg, ok := whatsappInbox.get(id)
	if !ok {
		response.NotFound(c, "message not found")
		return
	}

	contactName := ""
	if h.toolsUC != nil {
		// Best-effort: try resolving contact name using Google People search.
		q := msg.FromPhone
		if strings.TrimSpace(q) != "" {
			data, err := h.toolsUC.PeopleSearch(c.Request.Context(), q, 5, "")
			if err == nil {
				contactName = extractFirstPeopleDisplayName(data)
			}
		}
	}

	if strings.TrimSpace(h.orchestratorURL) == "" {
		response.Err(c, apperror.Validation("AI_ORCHESTRATOR_URL is not configured"))
		return
	}

	payload, _ := json.Marshal(map[string]any{
		"from_phone": msg.FromPhone,
		"from_name":  contactName,
		"message":    msg.Message,
	})

	req, err := http.NewRequestWithContext(
		c.Request.Context(),
		http.MethodPost,
		h.orchestratorURL+"/suggest/whatsapp",
		bytes.NewReader(payload),
	)
	if err != nil {
		response.Err(c, apperror.Wrap(err, apperror.CodeInternal, "failed to create request", http.StatusInternalServerError))
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", h.apiKey)

	resp, err := h.httpClient.Do(req)
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

	var parsed waSuggestResp
	if err := json.Unmarshal(b, &parsed); err != nil {
		response.Err(c, apperror.Wrap(err, apperror.CodeAgentError, "failed to decode orchestrator response", http.StatusBadGateway))
		return
	}
	if !parsed.Success && parsed.Error != nil {
		response.Err(c, apperror.New(apperror.CodeAgentError, parsed.Error.Message, http.StatusBadGateway))
		return
	}

	whatsappInbox.setSuggestion(id, contactName, parsed.Data.Reply)
	response.OK(c, gin.H{"id": id, "contact_name": contactName, "suggested_reply": parsed.Data.Reply})
}

type waSendRequest struct {
	Message string `json:"message" binding:"required"`
}

// Send handles POST /api/v1/whatsapp/inbox/:id/send
func (h *WhatsAppInboxHandler) Send(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	msg, ok := whatsappInbox.get(id)
	if !ok {
		response.NotFound(c, "message not found")
		return
	}

	var req waSendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	to := strings.TrimSpace(msg.FromPhone)
	if to == "" {
		to = strings.TrimSpace(msg.FromJID)
	}
	if strings.TrimSpace(to) == "" {
		response.BadRequest(c, "missing recipient")
		return
	}

	if h.toolsUC == nil {
		response.Err(c, apperror.New(apperror.CodeInternal, "tools usecase not configured", http.StatusInternalServerError))
		return
	}

	data, err := h.toolsUC.WhatsAppSend(c.Request.Context(), to, req.Message)
	if err != nil {
		response.Err(c, err)
		return
	}
	whatsappInbox.markSent(id, req.Message)
	response.OK(c, gin.H{"ok": true, "result": data})
}

func extractFirstPeopleDisplayName(data any) string {
	m, ok := data.(map[string]any)
	if !ok {
		return ""
	}
	results, ok := m["results"].([]any)
	if !ok || len(results) == 0 {
		return ""
	}
	first, ok := results[0].(map[string]any)
	if !ok {
		return ""
	}
	person, ok := first["person"].(map[string]any)
	if !ok {
		return ""
	}
	names, ok := person["names"].([]any)
	if !ok || len(names) == 0 {
		return ""
	}
	n0, ok := names[0].(map[string]any)
	if !ok {
		return ""
	}
	if dn, ok := n0["displayName"].(string); ok {
		return dn
	}
	return ""
}
