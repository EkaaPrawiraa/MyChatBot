package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/EkaaPrawiraa/axis-assistant/internal/delivery/http/handler"
	"github.com/EkaaPrawiraa/axis-assistant/internal/delivery/http/router"
	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/apperror"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// =====================================================================
// Mocks
// =====================================================================

// --- ChatUsecase mock ---
type mockChatUsecase struct {
	sendFn func(ctx context.Context, sessionID uuid.UUID, msg string) (*domain.ChatResponse, error)
}

func (m *mockChatUsecase) SendMessage(ctx context.Context, sessionID uuid.UUID, msg string) (*domain.ChatResponse, error) {
	if m.sendFn != nil {
		return m.sendFn(ctx, sessionID, msg)
	}
	return &domain.ChatResponse{Reply: "Hello!", Intent: "CHAT"}, nil
}

// --- ProfileUsecase mock ---
type mockProfileUsecase struct {
	profile *domain.OwnerProfile
	getErr  error
	updErr  error
}

func (m *mockProfileUsecase) GetProfile(ctx context.Context) (*domain.OwnerProfile, error) {
	if m.getErr != nil {
		return nil, m.getErr
	}
	if m.profile != nil {
		return m.profile, nil
	}
	return &domain.OwnerProfile{
		ID: 1, Name: "Test Owner", Email: "test@example.com",
		AIProvider: "openai", AIModel: "gpt-4o-mini",
	}, nil
}

func (m *mockProfileUsecase) UpdateProfile(ctx context.Context, profile *domain.OwnerProfile) error {
	if m.updErr != nil {
		return m.updErr
	}
	m.profile = profile
	return nil
}

// --- SessionUsecase mock ---
type mockSessionUsecase struct {
	sessions []domain.Session
	createFn func(ctx context.Context) (*domain.Session, error)
}

func (m *mockSessionUsecase) Create(ctx context.Context) (*domain.Session, error) {
	if m.createFn != nil {
		return m.createFn(ctx)
	}
	s := &domain.Session{ID: uuid.New(), Title: "New Conversation", Active: true, CreatedAt: time.Now()}
	return s, nil
}

func (m *mockSessionUsecase) GetByID(ctx context.Context, id uuid.UUID) (*domain.Session, error) {
	for _, s := range m.sessions {
		if s.ID == id {
			return &s, nil
		}
	}
	return nil, domain.ErrSessionNotFound
}

func (m *mockSessionUsecase) List(ctx context.Context, limit int) ([]domain.Session, error) {
	if limit > len(m.sessions) {
		limit = len(m.sessions)
	}
	return m.sessions[:limit], nil
}

func (m *mockSessionUsecase) Close(ctx context.Context, id uuid.UUID) error {
	for _, s := range m.sessions {
		if s.ID == id {
			return nil
		}
	}
	return domain.ErrSessionNotFound
}

// --- ActivityUsecase mock ---
type mockActivityUsecase struct {
	logs []domain.ActivityLog
}

func (m *mockActivityUsecase) Log(ctx context.Context, log *domain.ActivityLog) error {
	m.logs = append(m.logs, *log)
	return nil
}

func (m *mockActivityUsecase) GetLogs(ctx context.Context, limit, offset int) ([]domain.ActivityLog, error) {
	return m.logs, nil
}

// --- ReminderUsecase mock ---
type mockReminderUsecase struct {
	reminders []domain.Reminder
}

func (m *mockReminderUsecase) Create(ctx context.Context, r *domain.Reminder) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	m.reminders = append(m.reminders, *r)
	return nil
}

func (m *mockReminderUsecase) GetUpcoming(ctx context.Context, limit int) ([]domain.Reminder, error) {
	return m.reminders, nil
}

func (m *mockReminderUsecase) ProcessDue(ctx context.Context) error {
	return nil
}

// --- ApprovalUsecase mock ---
type mockApprovalUsecase struct {
	items []domain.ApprovalItem
}

func (m *mockApprovalUsecase) GetPending(ctx context.Context) ([]domain.ApprovalItem, error) {
	var pending []domain.ApprovalItem
	for _, it := range m.items {
		if it.Status == "pending" {
			pending = append(pending, it)
		}
	}
	return pending, nil
}

func (m *mockApprovalUsecase) Approve(ctx context.Context, id uuid.UUID, feedback string, plan []byte) error {
	for i, it := range m.items {
		if it.ID == id {
			if it.Status != "pending" {
				return domain.ErrApprovalResolved
			}
			m.items[i].Status = "approved"
			return nil
		}
	}
	return domain.ErrApprovalNotFound
}

func (m *mockApprovalUsecase) Reject(ctx context.Context, id uuid.UUID, feedback string) error {
	for i, it := range m.items {
		if it.ID == id {
			if it.Status != "pending" {
				return domain.ErrApprovalResolved
			}
			m.items[i].Status = "rejected"
			return nil
		}
	}
	return domain.ErrApprovalNotFound
}

// --- MemoryUsecase mock ---
type mockMemoryUsecase struct {
	shortTerm []domain.ShortTermMemory
	longTerm  []domain.LongTermMemory
}

func (m *mockMemoryUsecase) StoreShortTerm(ctx context.Context, mem *domain.ShortTermMemory) error {
	m.shortTerm = append(m.shortTerm, *mem)
	return nil
}

func (m *mockMemoryUsecase) GetConversation(ctx context.Context, sessionID uuid.UUID, limit int) ([]domain.ShortTermMemory, error) {
	var result []domain.ShortTermMemory
	for _, s := range m.shortTerm {
		if s.SessionID == sessionID {
			result = append(result, s)
		}
	}
	return result, nil
}

func (m *mockMemoryUsecase) StoreLongTerm(ctx context.Context, mem *domain.LongTermMemory) error {
	m.longTerm = append(m.longTerm, *mem)
	return nil
}

func (m *mockMemoryUsecase) SearchMemory(ctx context.Context, query string, limit int) ([]domain.LongTermMemory, error) {
	return m.longTerm, nil
}

func (m *mockMemoryUsecase) GetRecentMemories(ctx context.Context, limit int) ([]domain.LongTermMemory, error) {
	return m.longTerm, nil
}

// --- AutomationUsecase mock ---
type mockAutomationUsecase struct {
	rules []domain.AutomationRule
}

func (m *mockAutomationUsecase) Create(ctx context.Context, rule *domain.AutomationRule) error {
	if rule.ID == uuid.Nil {
		rule.ID = uuid.New()
	}
	m.rules = append(m.rules, *rule)
	return nil
}

func (m *mockAutomationUsecase) List(ctx context.Context) ([]domain.AutomationRule, error) {
	return m.rules, nil
}

func (m *mockAutomationUsecase) Update(ctx context.Context, rule *domain.AutomationRule) error {
	for i, r := range m.rules {
		if r.ID == rule.ID {
			m.rules[i] = *rule
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *mockAutomationUsecase) Delete(ctx context.Context, id uuid.UUID) error {
	for i, r := range m.rules {
		if r.ID == id {
			m.rules = append(m.rules[:i], m.rules[i+1:]...)
			return nil
		}
	}
	return domain.ErrNotFound
}

// --- ActivityLogRepository mock (for InternalHandler) ---
type mockActivityLogRepo struct {
	logs []domain.ActivityLog
}

func (m *mockActivityLogRepo) Create(ctx context.Context, log *domain.ActivityLog) error {
	m.logs = append(m.logs, *log)
	return nil
}

func (m *mockActivityLogRepo) List(ctx context.Context, limit, offset int) ([]domain.ActivityLog, error) {
	return m.logs, nil
}

func (m *mockActivityLogRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.ActivityLog, error) {
	for _, l := range m.logs {
		if l.ID == id {
			return &l, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *mockActivityLogRepo) GetBySession(ctx context.Context, sessionID uuid.UUID, limit int) ([]domain.ActivityLog, error) {
	return m.logs, nil
}

// --- ApprovalRepository mock (for InternalHandler) ---
type mockApprovalRepo struct {
	items []domain.ApprovalItem
}

func (m *mockApprovalRepo) Create(ctx context.Context, item *domain.ApprovalItem) error {
	m.items = append(m.items, *item)
	return nil
}

func (m *mockApprovalRepo) GetPending(ctx context.Context) ([]domain.ApprovalItem, error) {
	var result []domain.ApprovalItem
	for _, it := range m.items {
		if it.Status == "pending" {
			result = append(result, it)
		}
	}
	return result, nil
}

func (m *mockApprovalRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.ApprovalItem, error) {
	for _, it := range m.items {
		if it.ID == id {
			return &it, nil
		}
	}
	return nil, domain.ErrApprovalNotFound
}

func (m *mockApprovalRepo) Resolve(ctx context.Context, id uuid.UUID, status, feedback string, plan []byte) error {
	for i, it := range m.items {
		if it.ID == id {
			m.items[i].Status = status
			return nil
		}
	}
	return domain.ErrApprovalNotFound
}

// =====================================================================
// Test helpers
// =====================================================================

const testAPIKey = "test-secret-key"

func setupRouter() (*gin.Engine, *testMocks) {
	gin.SetMode(gin.TestMode)

	mocks := &testMocks{
		chat:       &mockChatUsecase{},
		profile:    &mockProfileUsecase{},
		session:    &mockSessionUsecase{sessions: []domain.Session{}},
		activity:   &mockActivityUsecase{},
		reminder:   &mockReminderUsecase{},
		approval:   &mockApprovalUsecase{},
		memory:     &mockMemoryUsecase{},
		automation: &mockAutomationUsecase{},
		actRepo:    &mockActivityLogRepo{},
		appRepo:    &mockApprovalRepo{},
	}

	r := gin.New()
	router.Setup(r, testAPIKey, router.Handlers{
		Chat:       handler.NewChatHandler(mocks.chat),
		Profile:    handler.NewProfileHandler(mocks.profile),
		Session:    handler.NewSessionHandler(mocks.session),
		Activity:   handler.NewActivityHandler(mocks.activity),
		Reminder:   handler.NewReminderHandler(mocks.reminder),
		Approval:   handler.NewApprovalHandler(mocks.approval),
		Memory:     handler.NewMemoryHandler(mocks.memory),
		Automation: handler.NewAutomationHandler(mocks.automation),
		Internal:   handler.NewInternalHandler(mocks.actRepo, mocks.appRepo, mocks.profile, mocks.reminder),
		AI:         handler.NewAIHandler("http://localhost:9999", testAPIKey),
	})

	return r, mocks
}

type testMocks struct {
	chat       *mockChatUsecase
	profile    *mockProfileUsecase
	session    *mockSessionUsecase
	activity   *mockActivityUsecase
	reminder   *mockReminderUsecase
	approval   *mockApprovalUsecase
	memory     *mockMemoryUsecase
	automation *mockAutomationUsecase
	actRepo    *mockActivityLogRepo
	appRepo    *mockApprovalRepo
}

func doRequest(r *gin.Engine, method, path string, body interface{}) *httptest.ResponseRecorder {
	return doRequestWithKey(r, method, path, body, testAPIKey)
}

func doRequestWithKey(r *gin.Engine, method, path string, body interface{}, apiKey string) *httptest.ResponseRecorder {
	var bodyReader *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		bodyReader = bytes.NewReader(b)
	} else {
		bodyReader = bytes.NewReader(nil)
	}

	req := httptest.NewRequest(method, path, bodyReader)
	req.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		req.Header.Set("X-API-Key", apiKey)
	}

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	return rec
}

type envelope struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data,omitempty"`
	Error   *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func parseEnvelope(t *testing.T, rec *httptest.ResponseRecorder) envelope {
	t.Helper()
	var env envelope
	if err := json.Unmarshal(rec.Body.Bytes(), &env); err != nil {
		t.Fatalf("failed to parse response envelope: %v\nbody: %s", err, rec.Body.String())
	}
	return env
}

// =====================================================================
// Health
// =====================================================================

func TestHealthCheck(t *testing.T) {
	r, _ := setupRouter()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	r.ServeHTTP(rec, req)

	if rec.Code != 200 {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var body map[string]string
	json.Unmarshal(rec.Body.Bytes(), &body)
	if body["status"] != "ok" {
		t.Fatalf("expected status=ok, got %s", body["status"])
	}
}

// =====================================================================
// Auth / API Key
// =====================================================================

func TestMissingAPIKey(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequestWithKey(r, http.MethodGet, "/api/v1/profile", nil, "")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
	env := parseEnvelope(t, rec)
	if env.Success {
		t.Fatal("expected success=false")
	}
}

func TestInvalidAPIKey(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequestWithKey(r, http.MethodGet, "/api/v1/profile", nil, "wrong-key")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestValidAPIKey(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodGet, "/api/v1/profile", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d; body: %s", rec.Code, rec.Body.String())
	}
}

// =====================================================================
// Profile
// =====================================================================

func TestGetProfile(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodGet, "/api/v1/profile", nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	env := parseEnvelope(t, rec)
	if !env.Success {
		t.Fatal("expected success=true")
	}

	var profile struct {
		Name           string `json:"name"`
		AIAPIKeyMasked string `json:"ai_api_key_masked"`
	}
	json.Unmarshal(env.Data, &profile)
	if profile.Name != "Test Owner" {
		t.Fatalf("expected name='Test Owner', got '%s'", profile.Name)
	}
}

func TestUpdateProfile(t *testing.T) {
	r, _ := setupRouter()

	name := "Updated Owner"
	rec := doRequest(r, http.MethodPut, "/api/v1/profile", map[string]interface{}{
		"name": name,
	})

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d; body: %s", rec.Code, rec.Body.String())
	}

	env := parseEnvelope(t, rec)
	if !env.Success {
		t.Fatal("expected success=true")
	}
}

func TestUpdateProfileInvalidProvider(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodPut, "/api/v1/profile", map[string]interface{}{
		"ai_provider": "invalid-provider",
	})

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestUpdateProfileValidProvider(t *testing.T) {
	r, _ := setupRouter()
	for _, provider := range []string{"openai", "anthropic", "xai"} {
		rec := doRequest(r, http.MethodPut, "/api/v1/profile", map[string]interface{}{
			"ai_provider": provider,
		})
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 for provider=%s, got %d", provider, rec.Code)
		}
	}
}

// =====================================================================
// Sessions
// =====================================================================

func TestCreateSession(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodPost, "/api/v1/sessions", nil)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d; body: %s", rec.Code, rec.Body.String())
	}

	env := parseEnvelope(t, rec)
	if !env.Success {
		t.Fatal("expected success=true")
	}
}

func TestListSessions(t *testing.T) {
	r, mocks := setupRouter()

	// Seed sessions
	id1, id2 := uuid.New(), uuid.New()
	mocks.session.sessions = []domain.Session{
		{ID: id1, Title: "Session 1", Active: true, CreatedAt: time.Now()},
		{ID: id2, Title: "Session 2", Active: true, CreatedAt: time.Now()},
	}

	rec := doRequest(r, http.MethodGet, "/api/v1/sessions?limit=10", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	env := parseEnvelope(t, rec)
	var sessions []domain.Session
	json.Unmarshal(env.Data, &sessions)
	if len(sessions) != 2 {
		t.Fatalf("expected 2 sessions, got %d", len(sessions))
	}
}

func TestGetSessionByID(t *testing.T) {
	r, mocks := setupRouter()
	id := uuid.New()
	mocks.session.sessions = []domain.Session{
		{ID: id, Title: "Test Session", Active: true},
	}

	rec := doRequest(r, http.MethodGet, "/api/v1/sessions/"+id.String(), nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestGetSessionNotFound(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodGet, "/api/v1/sessions/"+uuid.New().String(), nil)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d; body: %s", rec.Code, rec.Body.String())
	}
}

func TestGetSessionInvalidUUID(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodGet, "/api/v1/sessions/not-a-uuid", nil)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestCloseSession(t *testing.T) {
	r, mocks := setupRouter()
	id := uuid.New()
	mocks.session.sessions = []domain.Session{
		{ID: id, Title: "Active", Active: true},
	}

	rec := doRequest(r, http.MethodPost, "/api/v1/sessions/"+id.String()+"/close", nil)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d; body: %s", rec.Code, rec.Body.String())
	}
}

func TestCloseSessionNotFound(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodPost, "/api/v1/sessions/"+uuid.New().String()+"/close", nil)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}

// =====================================================================
// Chat
// =====================================================================

func TestSendMessage(t *testing.T) {
	r, _ := setupRouter()

	sessionID := uuid.New()
	rec := doRequest(r, http.MethodPost, "/api/v1/chat", map[string]interface{}{
		"session_id": sessionID.String(),
		"message":    "Hello Axis!",
	})

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d; body: %s", rec.Code, rec.Body.String())
	}

	env := parseEnvelope(t, rec)
	if !env.Success {
		t.Fatal("expected success=true")
	}

	var resp domain.ChatResponse
	json.Unmarshal(env.Data, &resp)
	if resp.Reply != "Hello!" {
		t.Fatalf("expected reply='Hello!', got '%s'", resp.Reply)
	}
}

func TestSendMessageMissingFields(t *testing.T) {
	r, _ := setupRouter()

	// Missing message
	rec := doRequest(r, http.MethodPost, "/api/v1/chat", map[string]interface{}{
		"session_id": uuid.New().String(),
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing message, got %d", rec.Code)
	}

	// Missing session_id
	rec = doRequest(r, http.MethodPost, "/api/v1/chat", map[string]interface{}{
		"message": "hello",
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing session_id, got %d", rec.Code)
	}
}

func TestSendMessageInvalidSessionID(t *testing.T) {
	r, _ := setupRouter()

	rec := doRequest(r, http.MethodPost, "/api/v1/chat", map[string]interface{}{
		"session_id": "not-a-uuid",
		"message":    "hello",
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestSendMessageUsecaseError(t *testing.T) {
	r, mocks := setupRouter()
	mocks.chat.sendFn = func(ctx context.Context, sid uuid.UUID, msg string) (*domain.ChatResponse, error) {
		return nil, apperror.Internal("something went wrong")
	}

	rec := doRequest(r, http.MethodPost, "/api/v1/chat", map[string]interface{}{
		"session_id": uuid.New().String(),
		"message":    "hello",
	})
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", rec.Code)
	}
}

// =====================================================================
// Activities
// =====================================================================

func TestListActivities(t *testing.T) {
	r, mocks := setupRouter()
	mocks.activity.logs = []domain.ActivityLog{
		{ID: uuid.New(), UserQuery: "test query", Intent: "CHAT", Success: true},
	}

	rec := doRequest(r, http.MethodGet, "/api/v1/activities?limit=10&offset=0", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	env := parseEnvelope(t, rec)
	var logs []domain.ActivityLog
	json.Unmarshal(env.Data, &logs)
	if len(logs) != 1 {
		t.Fatalf("expected 1 log, got %d", len(logs))
	}
}

func TestListActivitiesEmpty(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodGet, "/api/v1/activities", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

// =====================================================================
// Reminders
// =====================================================================

func TestCreateReminder(t *testing.T) {
	r, _ := setupRouter()

	scheduledAt := time.Now().Add(24 * time.Hour).Format(time.RFC3339)
	rec := doRequest(r, http.MethodPost, "/api/v1/reminders", map[string]interface{}{
		"title":        "Test Reminder",
		"description":  "Don't forget this",
		"scheduled_at": scheduledAt,
		"sent_via":     "email",
	})

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d; body: %s", rec.Code, rec.Body.String())
	}
}

func TestCreateReminderMissingTitle(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodPost, "/api/v1/reminders", map[string]interface{}{
		"scheduled_at": time.Now().Add(time.Hour).Format(time.RFC3339),
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestCreateReminderInvalidDate(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodPost, "/api/v1/reminders", map[string]interface{}{
		"title":        "Test",
		"scheduled_at": "not-a-date",
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestListReminders(t *testing.T) {
	r, mocks := setupRouter()
	mocks.reminder.reminders = []domain.Reminder{
		{ID: uuid.New(), Title: "Reminder 1"},
	}

	rec := doRequest(r, http.MethodGet, "/api/v1/reminders?limit=5", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

// =====================================================================
// Approvals
// =====================================================================

func TestGetPendingApprovals(t *testing.T) {
	r, mocks := setupRouter()
	mocks.approval.items = []domain.ApprovalItem{
		{ID: uuid.New(), Status: "pending", SessionID: uuid.New()},
		{ID: uuid.New(), Status: "approved", SessionID: uuid.New()},
	}

	rec := doRequest(r, http.MethodGet, "/api/v1/approvals", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	env := parseEnvelope(t, rec)
	var items []domain.ApprovalItem
	json.Unmarshal(env.Data, &items)
	if len(items) != 1 {
		t.Fatalf("expected 1 pending item, got %d", len(items))
	}
}

func TestApproveItem(t *testing.T) {
	r, mocks := setupRouter()
	id := uuid.New()
	mocks.approval.items = []domain.ApprovalItem{
		{ID: id, Status: "pending", SessionID: uuid.New()},
	}

	rec := doRequest(r, http.MethodPost, "/api/v1/approvals/"+id.String()+"/approve", map[string]interface{}{
		"feedback": "Looks good",
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d; body: %s", rec.Code, rec.Body.String())
	}
}

func TestApproveAlreadyResolved(t *testing.T) {
	r, mocks := setupRouter()
	id := uuid.New()
	mocks.approval.items = []domain.ApprovalItem{
		{ID: id, Status: "approved", SessionID: uuid.New()},
	}

	rec := doRequest(r, http.MethodPost, "/api/v1/approvals/"+id.String()+"/approve", map[string]interface{}{
		"feedback": "again",
	})
	if rec.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d", rec.Code)
	}
}

func TestRejectItem(t *testing.T) {
	r, mocks := setupRouter()
	id := uuid.New()
	mocks.approval.items = []domain.ApprovalItem{
		{ID: id, Status: "pending", SessionID: uuid.New()},
	}

	rec := doRequest(r, http.MethodPost, "/api/v1/approvals/"+id.String()+"/reject", map[string]interface{}{
		"feedback": "Not approved",
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestApproveNotFound(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodPost, "/api/v1/approvals/"+uuid.New().String()+"/approve", map[string]interface{}{
		"feedback": "test",
	})
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}

// =====================================================================
// Memory
// =====================================================================

func TestSearchMemory(t *testing.T) {
	r, mocks := setupRouter()
	mocks.memory.longTerm = []domain.LongTermMemory{
		{ID: uuid.New(), Content: "test memory", Category: "general"},
	}

	rec := doRequest(r, http.MethodGet, "/api/v1/memory/search?q=test&limit=5", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestSearchMemoryMissingQuery(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodGet, "/api/v1/memory/search", nil)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestGetRecentMemory(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodGet, "/api/v1/memory/recent?limit=10", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

// =====================================================================
// Automations
// =====================================================================

func TestCreateAutomation(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodPost, "/api/v1/automations", map[string]interface{}{
		"name":         "Test Rule",
		"trigger_type": "email_received",
	})
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d; body: %s", rec.Code, rec.Body.String())
	}
}

func TestCreateAutomationMissingName(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodPost, "/api/v1/automations", map[string]interface{}{
		"trigger_type": "email_received",
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestListAutomations(t *testing.T) {
	r, mocks := setupRouter()
	mocks.automation.rules = []domain.AutomationRule{
		{ID: uuid.New(), Name: "Rule 1", TriggerType: "email_received", Enabled: true},
	}

	rec := doRequest(r, http.MethodGet, "/api/v1/automations", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	env := parseEnvelope(t, rec)
	var rules []domain.AutomationRule
	json.Unmarshal(env.Data, &rules)
	if len(rules) != 1 {
		t.Fatalf("expected 1 rule, got %d", len(rules))
	}
}

func TestUpdateAutomation(t *testing.T) {
	r, mocks := setupRouter()
	id := uuid.New()
	mocks.automation.rules = []domain.AutomationRule{
		{ID: id, Name: "Original", TriggerType: "email_received", Enabled: true},
	}

	newName := "Updated Rule"
	rec := doRequest(r, http.MethodPut, "/api/v1/automations/"+id.String(), map[string]interface{}{
		"name": newName,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d; body: %s", rec.Code, rec.Body.String())
	}
}

func TestUpdateAutomationNotFound(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodPut, "/api/v1/automations/"+uuid.New().String(), map[string]interface{}{
		"name": "Nope",
	})
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}

func TestDeleteAutomation(t *testing.T) {
	r, mocks := setupRouter()
	id := uuid.New()
	mocks.automation.rules = []domain.AutomationRule{
		{ID: id, Name: "To Delete", TriggerType: "email_received"},
	}

	rec := doRequest(r, http.MethodDelete, "/api/v1/automations/"+id.String(), nil)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", rec.Code)
	}
}

func TestDeleteAutomationNotFound(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodDelete, "/api/v1/automations/"+uuid.New().String(), nil)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}

// =====================================================================
// Internal API (agent → backend)
// =====================================================================

func TestInternalLogActivity(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodPost, "/api/v1/internal/activity", map[string]interface{}{
		"user_query": "test query",
		"intent":     "CHAT",
		"success":    true,
	})
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d; body: %s", rec.Code, rec.Body.String())
	}
}

func TestInternalCreateApproval(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodPost, "/api/v1/internal/approval", map[string]interface{}{
		"session_id": uuid.New().String(),
		"status":     "pending",
	})
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d; body: %s", rec.Code, rec.Body.String())
	}
}

func TestInternalGetApproval(t *testing.T) {
	r, mocks := setupRouter()
	id := uuid.New()
	mocks.appRepo.items = []domain.ApprovalItem{
		{ID: id, Status: "pending", SessionID: uuid.New()},
	}

	rec := doRequest(r, http.MethodGet, "/api/v1/internal/approval/"+id.String(), nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestInternalGetApprovalNotFound(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodGet, "/api/v1/internal/approval/"+uuid.New().String(), nil)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}

func TestInternalGetProfile(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodGet, "/api/v1/internal/profile", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestInternalCreateReminder(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodPost, "/api/v1/internal/reminder", map[string]interface{}{
		"title":        "Agent Reminder",
		"description":  "From agent",
		"scheduled_at": time.Now().Add(time.Hour).Format(time.RFC3339),
	})
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d; body: %s", rec.Code, rec.Body.String())
	}
}

func TestInternalStoreShortTermMemory(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodPost, "/api/v1/internal/memory/short-term", map[string]interface{}{
		"id":         uuid.New().String(),
		"session_id": uuid.New().String(),
		"role":       "user",
		"message":    "hello",
	})
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d; body: %s", rec.Code, rec.Body.String())
	}
}

func TestInternalGetConversation(t *testing.T) {
	r, mocks := setupRouter()
	sessionID := uuid.New()
	mocks.memory.shortTerm = []domain.ShortTermMemory{
		{ID: uuid.New(), SessionID: sessionID, Role: "user", Message: "hi"},
	}

	rec := doRequest(r, http.MethodGet, fmt.Sprintf("/api/v1/internal/memory/short-term/%s?limit=10", sessionID), nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestInternalStoreLongTermMemory(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodPost, "/api/v1/internal/memory/long-term", map[string]interface{}{
		"id":       uuid.New().String(),
		"content":  "important fact",
		"category": "user_note",
	})
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d; body: %s", rec.Code, rec.Body.String())
	}
}

func TestInternalVectorSearch(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodPost, "/api/v1/internal/memory/search", map[string]interface{}{
		"query": "test query",
		"limit": 5,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d; body: %s", rec.Code, rec.Body.String())
	}
}

// =====================================================================
// Usecase-level tests
// =====================================================================

func TestSessionUsecaseCreateAndList(t *testing.T) {
	repo := &mockSessionRepo{}
	uc := NewTestSessionUsecase(repo)

	ctx := context.Background()
	s, err := uc.Create(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.Title != "New Conversation" {
		t.Fatalf("expected title 'New Conversation', got '%s'", s.Title)
	}

	list, err := uc.List(ctx, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 session, got %d", len(list))
	}
}

// Simple in-memory session repo for usecase-level testing
type mockSessionRepo struct {
	items []domain.Session
}

func (r *mockSessionRepo) Create(ctx context.Context, s *domain.Session) error {
	r.items = append(r.items, *s)
	return nil
}

func (r *mockSessionRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Session, error) {
	for _, s := range r.items {
		if s.ID == id {
			return &s, nil
		}
	}
	return nil, domain.ErrSessionNotFound
}

func (r *mockSessionRepo) List(ctx context.Context, limit int) ([]domain.Session, error) {
	if limit > len(r.items) {
		limit = len(r.items)
	}
	return r.items[:limit], nil
}

func (r *mockSessionRepo) Close(ctx context.Context, id uuid.UUID) error {
	for i, s := range r.items {
		if s.ID == id {
			r.items[i].Active = false
			return nil
		}
	}
	return domain.ErrSessionNotFound
}

// NewTestSessionUsecase is a test helper that mirrors the real constructor
func NewTestSessionUsecase(repo domain.SessionRepository) domain.SessionUsecase {
	return &testSessionUC{repo: repo}
}

type testSessionUC struct {
	repo domain.SessionRepository
}

func (u *testSessionUC) Create(ctx context.Context) (*domain.Session, error) {
	s := &domain.Session{ID: uuid.New(), Title: "New Conversation", Active: true}
	if err := u.repo.Create(ctx, s); err != nil {
		return nil, err
	}
	return s, nil
}

func (u *testSessionUC) GetByID(ctx context.Context, id uuid.UUID) (*domain.Session, error) {
	return u.repo.GetByID(ctx, id)
}

func (u *testSessionUC) List(ctx context.Context, limit int) ([]domain.Session, error) {
	return u.repo.List(ctx, limit)
}

func (u *testSessionUC) Close(ctx context.Context, id uuid.UUID) error {
	return u.repo.Close(ctx, id)
}

// =====================================================================
// Profile usecase tests
// =====================================================================

func TestProfileUsecaseGetAndUpdate(t *testing.T) {
	repo := &mockProfileRepo{
		profile: &domain.OwnerProfile{
			ID: 1, Name: "Original", Email: "original@test.com",
			AIProvider: "openai", AIModel: "gpt-4o-mini",
		},
	}

	uc := &testProfileUC{repo: repo}

	ctx := context.Background()
	p, err := uc.GetProfile(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if p.Name != "Original" {
		t.Fatalf("expected 'Original', got '%s'", p.Name)
	}

	p.Name = "Updated"
	if err := uc.UpdateProfile(ctx, p); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	p2, _ := uc.GetProfile(ctx)
	if p2.Name != "Updated" {
		t.Fatalf("expected 'Updated', got '%s'", p2.Name)
	}
}

type mockProfileRepo struct {
	profile *domain.OwnerProfile
}

func (r *mockProfileRepo) Get(ctx context.Context) (*domain.OwnerProfile, error) {
	if r.profile == nil {
		return nil, domain.ErrProfileNotFound
	}
	return r.profile, nil
}

func (r *mockProfileRepo) Update(ctx context.Context, p *domain.OwnerProfile) error {
	r.profile = p
	return nil
}

type testProfileUC struct {
	repo domain.OwnerProfileRepository
}

func (u *testProfileUC) GetProfile(ctx context.Context) (*domain.OwnerProfile, error) {
	return u.repo.Get(ctx)
}

func (u *testProfileUC) UpdateProfile(ctx context.Context, p *domain.OwnerProfile) error {
	p.ID = 1
	return u.repo.Update(ctx, p)
}

// =====================================================================
// Approval usecase tests
// =====================================================================

func TestApprovalUsecaseApproveReject(t *testing.T) {
	id1, id2 := uuid.New(), uuid.New()
	repo := &mockApprovalRepo{
		items: []domain.ApprovalItem{
			{ID: id1, Status: "pending", SessionID: uuid.New()},
			{ID: id2, Status: "pending", SessionID: uuid.New()},
		},
	}

	uc := &testApprovalUC{repo: repo}
	ctx := context.Background()

	// Approve first
	if err := uc.Approve(ctx, id1, "ok", nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Reject second
	if err := uc.Reject(ctx, id2, "no"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Try to approve already-resolved
	err := uc.Approve(ctx, id1, "again", nil)
	if err == nil {
		t.Fatal("expected error for already-resolved approval")
	}
}

type testApprovalUC struct {
	repo domain.ApprovalRepository
}

func (u *testApprovalUC) GetPending(ctx context.Context) ([]domain.ApprovalItem, error) {
	return u.repo.GetPending(ctx)
}

func (u *testApprovalUC) Approve(ctx context.Context, id uuid.UUID, feedback string, plan []byte) error {
	item, err := u.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if item.Status != "pending" {
		return domain.ErrApprovalResolved
	}
	return u.repo.Resolve(ctx, id, "approved", feedback, plan)
}

func (u *testApprovalUC) Reject(ctx context.Context, id uuid.UUID, feedback string) error {
	item, err := u.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if item.Status != "pending" {
		return domain.ErrApprovalResolved
	}
	return u.repo.Resolve(ctx, id, "rejected", feedback, nil)
}

// =====================================================================
// Domain entity tests
// =====================================================================

func TestAIKeyMasked(t *testing.T) {
	tests := []struct {
		key    string
		expect string
	}{
		{"", ""},
		{"abc", "****"},
		{"abcdefgh", "****"},
		{"sk-proj-1234567890abcdef", "sk-p...cdef"},
	}

	for _, tt := range tests {
		p := domain.OwnerProfile{AIAPIKey: tt.key}
		got := p.AIKeyMasked()
		if got != tt.expect {
			t.Errorf("AIKeyMasked(%q) = %q, want %q", tt.key, got, tt.expect)
		}
	}
}

// =====================================================================
// Response envelope tests
// =====================================================================

func TestEnvelopeFormat(t *testing.T) {
	r, _ := setupRouter()
	rec := doRequest(r, http.MethodGet, "/api/v1/profile", nil)

	var raw map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &raw)

	// Must have success, data, meta keys
	if _, ok := raw["success"]; !ok {
		t.Fatal("missing 'success' key in envelope")
	}
	if _, ok := raw["data"]; !ok {
		t.Fatal("missing 'data' key in envelope")
	}
	if _, ok := raw["meta"]; !ok {
		t.Fatal("missing 'meta' key in envelope")
	}

	meta, ok := raw["meta"].(map[string]interface{})
	if !ok {
		t.Fatal("meta should be an object")
	}
	if _, ok := meta["timestamp"]; !ok {
		t.Fatal("missing 'timestamp' in meta")
	}
}
