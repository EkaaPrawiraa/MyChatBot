package usecase_test

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/google/uuid"
)

// =====================================================================
// Mock repositories
// =====================================================================

type mockSessionRepo struct {
	items []domain.Session
}

func (r *mockSessionRepo) Create(_ context.Context, s *domain.Session) error {
	s.CreatedAt = time.Now()
	s.UpdatedAt = time.Now()
	r.items = append(r.items, *s)
	return nil
}

func (r *mockSessionRepo) GetByID(_ context.Context, id uuid.UUID) (*domain.Session, error) {
	for _, s := range r.items {
		if s.ID == id {
			return &s, nil
		}
	}
	return nil, domain.ErrSessionNotFound
}

func (r *mockSessionRepo) List(_ context.Context, limit int) ([]domain.Session, error) {
	if limit > len(r.items) {
		limit = len(r.items)
	}
	return r.items[:limit], nil
}

func (r *mockSessionRepo) Close(_ context.Context, id uuid.UUID) error {
	for i, s := range r.items {
		if s.ID == id {
			r.items[i].Active = false
			return nil
		}
	}
	return domain.ErrSessionNotFound
}

func (r *mockSessionRepo) Delete(_ context.Context, id uuid.UUID) error {
	for i, s := range r.items {
		if s.ID == id {
			r.items = append(r.items[:i], r.items[i+1:]...)
			return nil
		}
	}
	return domain.ErrSessionNotFound
}

type mockProfileRepo struct {
	profile *domain.OwnerProfile
}

func (r *mockProfileRepo) Get(_ context.Context) (*domain.OwnerProfile, error) {
	if r.profile == nil {
		return nil, domain.ErrProfileNotFound
	}
	return r.profile, nil
}

func (r *mockProfileRepo) Update(_ context.Context, p *domain.OwnerProfile) error {
	r.profile = p
	return nil
}

type mockShortTermRepo struct {
	items []domain.ShortTermMemory
}

func (r *mockShortTermRepo) Store(_ context.Context, mem *domain.ShortTermMemory) error {
	r.items = append(r.items, *mem)
	return nil
}

func (r *mockShortTermRepo) GetBySession(_ context.Context, sessionID uuid.UUID, limit int) ([]domain.ShortTermMemory, error) {
	var result []domain.ShortTermMemory
	for _, m := range r.items {
		if m.SessionID == sessionID {
			result = append(result, m)
		}
	}
	if limit > 0 && len(result) > limit {
		result = result[:limit]
	}
	return result, nil
}

func (r *mockShortTermRepo) DeleteBySession(_ context.Context, sessionID uuid.UUID) error {
	var filtered []domain.ShortTermMemory
	for _, m := range r.items {
		if m.SessionID != sessionID {
			filtered = append(filtered, m)
		}
	}
	r.items = filtered
	return nil
}

type mockLongTermRepo struct {
	items []domain.LongTermMemory
}

func (r *mockLongTermRepo) Store(_ context.Context, mem *domain.LongTermMemory) error {
	r.items = append(r.items, *mem)
	return nil
}

func (r *mockLongTermRepo) SearchSimilar(_ context.Context, _ []float32, limit int) ([]domain.LongTermMemory, error) {
	if limit > len(r.items) {
		limit = len(r.items)
	}
	return r.items[:limit], nil
}

func (r *mockLongTermRepo) GetRecent(_ context.Context, limit int) ([]domain.LongTermMemory, error) {
	if limit > len(r.items) {
		limit = len(r.items)
	}
	return r.items[:limit], nil
}

func (r *mockLongTermRepo) GetByCategory(_ context.Context, category string, limit int) ([]domain.LongTermMemory, error) {
	var result []domain.LongTermMemory
	for _, m := range r.items {
		if m.Category == category {
			result = append(result, m)
		}
	}
	return result, nil
}

type mockActivityLogRepo struct {
	items []domain.ActivityLog
}

func (r *mockActivityLogRepo) Create(_ context.Context, log *domain.ActivityLog) error {
	r.items = append(r.items, *log)
	return nil
}

func (r *mockActivityLogRepo) List(_ context.Context, limit, offset int) ([]domain.ActivityLog, error) {
	if offset >= len(r.items) {
		return nil, nil
	}
	end := offset + limit
	if end > len(r.items) {
		end = len(r.items)
	}
	return r.items[offset:end], nil
}

func (r *mockActivityLogRepo) GetByID(_ context.Context, id uuid.UUID) (*domain.ActivityLog, error) {
	for _, l := range r.items {
		if l.ID == id {
			return &l, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (r *mockActivityLogRepo) GetBySession(_ context.Context, sessionID uuid.UUID, limit int) ([]domain.ActivityLog, error) {
	return r.items, nil
}

type mockReminderRepo struct {
	items []domain.Reminder
}

func (r *mockReminderRepo) Create(_ context.Context, rem *domain.Reminder) error {
	r.items = append(r.items, *rem)
	return nil
}

func (r *mockReminderRepo) List(_ context.Context, limit int) ([]domain.Reminder, error) {
	if limit > len(r.items) {
		limit = len(r.items)
	}
	return r.items[:limit], nil
}

func (r *mockReminderRepo) GetDue(_ context.Context) ([]domain.Reminder, error) {
	var due []domain.Reminder
	for _, rem := range r.items {
		if !rem.Sent && rem.ScheduledAt.Before(time.Now()) {
			due = append(due, rem)
		}
	}
	return due, nil
}

func (r *mockReminderRepo) MarkSent(_ context.Context, id uuid.UUID) error {
	for i, rem := range r.items {
		if rem.ID == id {
			r.items[i].Sent = true
			return nil
		}
	}
	return domain.ErrNotFound
}

func (r *mockReminderRepo) Delete(_ context.Context, id uuid.UUID) error {
	for i, rem := range r.items {
		if rem.ID == id {
			r.items = append(r.items[:i], r.items[i+1:]...)
			return nil
		}
	}
	return domain.ErrNotFound
}

type mockAutomationRepo struct {
	items []domain.AutomationRule
}

func (r *mockAutomationRepo) Create(_ context.Context, rule *domain.AutomationRule) error {
	r.items = append(r.items, *rule)
	return nil
}

func (r *mockAutomationRepo) List(_ context.Context) ([]domain.AutomationRule, error) {
	return r.items, nil
}

func (r *mockAutomationRepo) GetByID(_ context.Context, id uuid.UUID) (*domain.AutomationRule, error) {
	for _, rule := range r.items {
		if rule.ID == id {
			return &rule, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (r *mockAutomationRepo) Update(_ context.Context, rule *domain.AutomationRule) error {
	for i, existing := range r.items {
		if existing.ID == rule.ID {
			r.items[i] = *rule
			return nil
		}
	}
	return domain.ErrNotFound
}

func (r *mockAutomationRepo) Delete(_ context.Context, id uuid.UUID) error {
	for i, rule := range r.items {
		if rule.ID == id {
			r.items = append(r.items[:i], r.items[i+1:]...)
			return nil
		}
	}
	return domain.ErrNotFound
}

func (r *mockAutomationRepo) GetByTrigger(_ context.Context, triggerType string) ([]domain.AutomationRule, error) {
	var result []domain.AutomationRule
	for _, rule := range r.items {
		if rule.TriggerType == triggerType {
			result = append(result, rule)
		}
	}
	return result, nil
}

type mockApprovalRepo struct {
	items []domain.ApprovalItem
}

func (r *mockApprovalRepo) Create(_ context.Context, item *domain.ApprovalItem) error {
	r.items = append(r.items, *item)
	return nil
}

func (r *mockApprovalRepo) GetPending(_ context.Context) ([]domain.ApprovalItem, error) {
	var result []domain.ApprovalItem
	for _, it := range r.items {
		if it.Status == "pending" {
			result = append(result, it)
		}
	}
	return result, nil
}

func (r *mockApprovalRepo) GetByID(_ context.Context, id uuid.UUID) (*domain.ApprovalItem, error) {
	for _, it := range r.items {
		if it.ID == id {
			return &it, nil
		}
	}
	return nil, domain.ErrApprovalNotFound
}

func (r *mockApprovalRepo) Resolve(_ context.Context, id uuid.UUID, status, feedback string, plan []byte) error {
	for i, it := range r.items {
		if it.ID == id {
			r.items[i].Status = status
			r.items[i].UserFeedback = &feedback
			r.items[i].ModifiedPlan = plan
			return nil
		}
	}
	return domain.ErrApprovalNotFound
}

// =====================================================================
// Session Usecase Tests
// =====================================================================

func TestSessionCreate(t *testing.T) {
	repo := &mockSessionRepo{}
	uc := newSessionUsecase(repo)

	ctx := context.Background()
	session, err := uc.Create(ctx, "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if session.ID == uuid.Nil {
		t.Fatal("session ID should not be nil")
	}
	if session.Title != "New Conversation" {
		t.Fatalf("expected 'New Conversation', got '%s'", session.Title)
	}
	if !session.Active {
		t.Fatal("new session should be active")
	}
}

func TestSessionGetByID(t *testing.T) {
	repo := &mockSessionRepo{}
	uc := newSessionUsecase(repo)
	ctx := context.Background()

	created, _ := uc.Create(ctx, "")
	found, err := uc.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if found.ID != created.ID {
		t.Fatalf("session ID mismatch")
	}
}

func TestSessionGetByIDNotFound(t *testing.T) {
	repo := &mockSessionRepo{}
	uc := newSessionUsecase(repo)
	ctx := context.Background()

	_, err := uc.GetByID(ctx, uuid.New())
	if err != domain.ErrSessionNotFound {
		t.Fatalf("expected ErrSessionNotFound, got %v", err)
	}
}

func TestSessionList(t *testing.T) {
	repo := &mockSessionRepo{}
	uc := newSessionUsecase(repo)
	ctx := context.Background()

	uc.Create(ctx, "")
	uc.Create(ctx, "")
	uc.Create(ctx, "")

	list, err := uc.List(ctx, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(list) != 3 {
		t.Fatalf("expected 3, got %d", len(list))
	}
}

func TestSessionListWithLimit(t *testing.T) {
	repo := &mockSessionRepo{}
	uc := newSessionUsecase(repo)
	ctx := context.Background()

	for i := 0; i < 5; i++ {
		uc.Create(ctx, "")
	}

	list, err := uc.List(ctx, 2)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(list) != 2 {
		t.Fatalf("expected 2, got %d", len(list))
	}
}

func TestSessionClose(t *testing.T) {
	repo := &mockSessionRepo{}
	uc := newSessionUsecase(repo)
	ctx := context.Background()

	s, _ := uc.Create(ctx, "")
	err := uc.Close(ctx, s.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestSessionCloseNotFound(t *testing.T) {
	repo := &mockSessionRepo{}
	uc := newSessionUsecase(repo)
	ctx := context.Background()

	err := uc.Close(ctx, uuid.New())
	if err != domain.ErrSessionNotFound {
		t.Fatalf("expected ErrSessionNotFound, got %v", err)
	}
}

// =====================================================================
// Profile Usecase Tests
// =====================================================================

func TestProfileGet(t *testing.T) {
	repo := &mockProfileRepo{
		profile: &domain.OwnerProfile{
			ID: 1, Name: "Test", Email: "test@test.com",
			AIProvider: "openai", AIModel: "gpt-4o-mini",
		},
	}
	uc := newProfileUsecase(repo)
	ctx := context.Background()

	p, err := uc.GetProfile(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if p.Name != "Test" {
		t.Fatalf("expected 'Test', got '%s'", p.Name)
	}
}

func TestProfileGetNotFound(t *testing.T) {
	repo := &mockProfileRepo{profile: nil}
	uc := newProfileUsecase(repo)
	ctx := context.Background()

	_, err := uc.GetProfile(ctx)
	if err != domain.ErrProfileNotFound {
		t.Fatalf("expected ErrProfileNotFound, got %v", err)
	}
}

func TestProfileUpdate(t *testing.T) {
	repo := &mockProfileRepo{
		profile: &domain.OwnerProfile{ID: 1, Name: "Before"},
	}
	uc := newProfileUsecase(repo)
	ctx := context.Background()

	err := uc.UpdateProfile(ctx, &domain.OwnerProfile{Name: "After"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	p, _ := uc.GetProfile(ctx)
	if p.Name != "After" {
		t.Fatalf("expected 'After', got '%s'", p.Name)
	}
	if p.ID != 1 {
		t.Fatal("ID should always be 1")
	}
}

// =====================================================================
// Memory Usecase Tests
// =====================================================================

func TestMemoryStoreAndGetShortTerm(t *testing.T) {
	shortRepo := &mockShortTermRepo{}
	longRepo := &mockLongTermRepo{}
	uc := newMemoryUsecase(shortRepo, longRepo)
	ctx := context.Background()

	sessionID := uuid.New()
	mem := &domain.ShortTermMemory{
		SessionID: sessionID,
		Role:      "user",
		Message:   "hello",
	}

	if err := uc.StoreShortTerm(ctx, mem); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if mem.ID == uuid.Nil {
		t.Fatal("ID should have been assigned")
	}

	msgs, err := uc.GetConversation(ctx, sessionID, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(msgs) != 1 {
		t.Fatalf("expected 1, got %d", len(msgs))
	}
}

func TestMemoryStoreAndGetLongTerm(t *testing.T) {
	shortRepo := &mockShortTermRepo{}
	longRepo := &mockLongTermRepo{}
	uc := newMemoryUsecase(shortRepo, longRepo)
	ctx := context.Background()

	mem := &domain.LongTermMemory{
		Content:  "important fact",
		Category: "user_note",
	}
	if err := uc.StoreLongTerm(ctx, mem); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	recent, err := uc.GetRecentMemories(ctx, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(recent) != 1 {
		t.Fatalf("expected 1, got %d", len(recent))
	}
}

func TestMemorySearch(t *testing.T) {
	shortRepo := &mockShortTermRepo{}
	longRepo := &mockLongTermRepo{
		items: []domain.LongTermMemory{
			{ID: uuid.New(), Content: "test memory"},
		},
	}
	uc := newMemoryUsecase(shortRepo, longRepo)
	ctx := context.Background()

	results, err := uc.SearchMemory(ctx, "test", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1, got %d", len(results))
	}
}

// =====================================================================
// Activity Usecase Tests
// =====================================================================

func TestActivityLogAndGet(t *testing.T) {
	repo := &mockActivityLogRepo{}
	uc := newActivityUsecase(repo)
	ctx := context.Background()

	log := &domain.ActivityLog{
		UserQuery: "send email",
		Intent:    "TASK_EXECUTION",
		Success:   true,
	}
	if err := uc.Log(ctx, log); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if log.ID == uuid.Nil {
		t.Fatal("ID should have been assigned")
	}

	logs, err := uc.GetLogs(ctx, 10, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("expected 1, got %d", len(logs))
	}
}

// =====================================================================
// Reminder Usecase Tests
// =====================================================================

func TestReminderCreateAndList(t *testing.T) {
	repo := &mockReminderRepo{}
	uc := newReminderUsecase(repo)
	ctx := context.Background()

	rem := &domain.Reminder{
		Title:       "Test Reminder",
		ScheduledAt: time.Now().Add(24 * time.Hour),
	}
	if err := uc.Create(ctx, rem); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	list, err := uc.GetUpcoming(ctx, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1, got %d", len(list))
	}
}

// =====================================================================
// Automation Usecase Tests
// =====================================================================

func TestAutomationCRUD(t *testing.T) {
	repo := &mockAutomationRepo{}
	uc := newAutomationUsecase(repo)
	ctx := context.Background()

	// Create
	rule := &domain.AutomationRule{
		Name:        "Email Filter",
		TriggerType: "email_received",
		Enabled:     true,
	}
	if err := uc.Create(ctx, rule); err != nil {
		t.Fatalf("create error: %v", err)
	}
	if rule.ID == uuid.Nil {
		t.Fatal("ID should have been assigned")
	}

	// List
	rules, err := uc.List(ctx)
	if err != nil {
		t.Fatalf("list error: %v", err)
	}
	if len(rules) != 1 {
		t.Fatalf("expected 1, got %d", len(rules))
	}

	// Update
	rule.Name = "Updated Filter"
	if err := uc.Update(ctx, rule); err != nil {
		t.Fatalf("update error: %v", err)
	}

	// Delete
	if err := uc.Delete(ctx, rule.ID); err != nil {
		t.Fatalf("delete error: %v", err)
	}

	rules, _ = uc.List(ctx)
	if len(rules) != 0 {
		t.Fatalf("expected 0 after delete, got %d", len(rules))
	}
}

func TestAutomationUpdateNotFound(t *testing.T) {
	repo := &mockAutomationRepo{}
	uc := newAutomationUsecase(repo)
	ctx := context.Background()

	err := uc.Update(ctx, &domain.AutomationRule{ID: uuid.New(), Name: "Nope"})
	if err != domain.ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestAutomationDeleteNotFound(t *testing.T) {
	repo := &mockAutomationRepo{}
	uc := newAutomationUsecase(repo)
	ctx := context.Background()

	err := uc.Delete(ctx, uuid.New())
	if err != domain.ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

// =====================================================================
// Approval Usecase Tests
// =====================================================================

func TestApprovalGetPending(t *testing.T) {
	id1, id2, id3 := uuid.New(), uuid.New(), uuid.New()
	repo := &mockApprovalRepo{
		items: []domain.ApprovalItem{
			{ID: id1, Status: "pending"},
			{ID: id2, Status: "approved"},
			{ID: id3, Status: "pending"},
		},
	}
	uc := newApprovalUsecase(repo)
	ctx := context.Background()

	pending, err := uc.GetPending(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(pending) != 2 {
		t.Fatalf("expected 2 pending, got %d", len(pending))
	}
}

func TestApprovalApprove(t *testing.T) {
	id := uuid.New()
	repo := &mockApprovalRepo{
		items: []domain.ApprovalItem{
			{ID: id, Status: "pending"},
		},
	}
	uc := newApprovalUsecase(repo)
	ctx := context.Background()

	if err := uc.Approve(ctx, id, "lgtm", nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Double-approve should fail
	err := uc.Approve(ctx, id, "again", nil)
	if err != domain.ErrApprovalResolved {
		t.Fatalf("expected ErrApprovalResolved, got %v", err)
	}
}

func TestApprovalReject(t *testing.T) {
	id := uuid.New()
	repo := &mockApprovalRepo{
		items: []domain.ApprovalItem{
			{ID: id, Status: "pending"},
		},
	}
	uc := newApprovalUsecase(repo)
	ctx := context.Background()

	if err := uc.Reject(ctx, id, "nope"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	err := uc.Reject(ctx, id, "again")
	if err != domain.ErrApprovalResolved {
		t.Fatalf("expected ErrApprovalResolved, got %v", err)
	}
}

func TestApprovalNotFound(t *testing.T) {
	repo := &mockApprovalRepo{}
	uc := newApprovalUsecase(repo)
	ctx := context.Background()

	err := uc.Approve(ctx, uuid.New(), "test", nil)
	if err != domain.ErrApprovalNotFound {
		t.Fatalf("expected ErrApprovalNotFound, got %v", err)
	}
}

// =====================================================================
// Usecase constructors (mirror real implementations for unit testing)
// =====================================================================

type sessionUC struct{ repo domain.SessionRepository }

func newSessionUsecase(repo domain.SessionRepository) domain.SessionUsecase {
	return &sessionUC{repo: repo}
}

func (u *sessionUC) Create(ctx context.Context, title string) (*domain.Session, error) {
	if strings.TrimSpace(title) == "" {
		title = "New Conversation"
	}
	s := &domain.Session{ID: uuid.New(), Title: title, Active: true}
	if err := u.repo.Create(ctx, s); err != nil {
		return nil, err
	}
	return s, nil
}

func (u *sessionUC) GetByID(ctx context.Context, id uuid.UUID) (*domain.Session, error) {
	return u.repo.GetByID(ctx, id)
}

func (u *sessionUC) List(ctx context.Context, limit int) ([]domain.Session, error) {
	if limit <= 0 {
		limit = 20
	}
	return u.repo.List(ctx, limit)
}

func (u *sessionUC) Close(ctx context.Context, id uuid.UUID) error {
	return u.repo.Close(ctx, id)
}

func (u *sessionUC) Delete(ctx context.Context, id uuid.UUID) error {
	return u.repo.Delete(ctx, id)
}

type profileUC struct{ repo domain.OwnerProfileRepository }

func newProfileUsecase(repo domain.OwnerProfileRepository) domain.ProfileUsecase {
	return &profileUC{repo: repo}
}

func (u *profileUC) GetProfile(ctx context.Context) (*domain.OwnerProfile, error) {
	return u.repo.Get(ctx)
}

func (u *profileUC) UpdateProfile(ctx context.Context, p *domain.OwnerProfile) error {
	p.ID = 1
	return u.repo.Update(ctx, p)
}

type memoryUC struct {
	shortRepo domain.ShortTermMemoryRepository
	longRepo  domain.LongTermMemoryRepository
}

func newMemoryUsecase(s domain.ShortTermMemoryRepository, l domain.LongTermMemoryRepository) domain.MemoryUsecase {
	return &memoryUC{shortRepo: s, longRepo: l}
}

func (u *memoryUC) StoreShortTerm(ctx context.Context, mem *domain.ShortTermMemory) error {
	if mem.ID == uuid.Nil {
		mem.ID = uuid.New()
	}
	return u.shortRepo.Store(ctx, mem)
}

func (u *memoryUC) GetConversation(ctx context.Context, sessionID uuid.UUID, limit int) ([]domain.ShortTermMemory, error) {
	return u.shortRepo.GetBySession(ctx, sessionID, limit)
}

func (u *memoryUC) StoreLongTerm(ctx context.Context, mem *domain.LongTermMemory) error {
	if mem.ID == uuid.Nil {
		mem.ID = uuid.New()
	}
	return u.longRepo.Store(ctx, mem)
}

func (u *memoryUC) SearchMemory(ctx context.Context, query string, limit int) ([]domain.LongTermMemory, error) {
	return u.longRepo.GetRecent(ctx, limit)
}

func (u *memoryUC) GetRecentMemories(ctx context.Context, limit int) ([]domain.LongTermMemory, error) {
	return u.longRepo.GetRecent(ctx, limit)
}

type activityUC struct{ repo domain.ActivityLogRepository }

func newActivityUsecase(repo domain.ActivityLogRepository) domain.ActivityUsecase {
	return &activityUC{repo: repo}
}

func (u *activityUC) Log(ctx context.Context, log *domain.ActivityLog) error {
	if log.ID == uuid.Nil {
		log.ID = uuid.New()
	}
	return u.repo.Create(ctx, log)
}

func (u *activityUC) GetLogs(ctx context.Context, limit, offset int) ([]domain.ActivityLog, error) {
	return u.repo.List(ctx, limit, offset)
}

type reminderUC struct{ repo domain.ReminderRepository }

func newReminderUsecase(repo domain.ReminderRepository) domain.ReminderUsecase {
	return &reminderUC{repo: repo}
}

func (u *reminderUC) Create(ctx context.Context, r *domain.Reminder) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return u.repo.Create(ctx, r)
}

func (u *reminderUC) GetUpcoming(ctx context.Context, limit int) ([]domain.Reminder, error) {
	return u.repo.List(ctx, limit)
}

func (u *reminderUC) ProcessDue(ctx context.Context) error { return nil }

type automationUC struct{ repo domain.AutomationRuleRepository }

func newAutomationUsecase(repo domain.AutomationRuleRepository) domain.AutomationUsecase {
	return &automationUC{repo: repo}
}

func (u *automationUC) Create(ctx context.Context, rule *domain.AutomationRule) error {
	if rule.ID == uuid.Nil {
		rule.ID = uuid.New()
	}
	return u.repo.Create(ctx, rule)
}

func (u *automationUC) List(ctx context.Context) ([]domain.AutomationRule, error) {
	return u.repo.List(ctx)
}

func (u *automationUC) Update(ctx context.Context, rule *domain.AutomationRule) error {
	if _, err := u.repo.GetByID(ctx, rule.ID); err != nil {
		return err
	}
	return u.repo.Update(ctx, rule)
}

func (u *automationUC) Delete(ctx context.Context, id uuid.UUID) error {
	if _, err := u.repo.GetByID(ctx, id); err != nil {
		return err
	}
	return u.repo.Delete(ctx, id)
}

type approvalUC struct{ repo domain.ApprovalRepository }

func newApprovalUsecase(repo domain.ApprovalRepository) domain.ApprovalUsecase {
	return &approvalUC{repo: repo}
}

func (u *approvalUC) GetPending(ctx context.Context) ([]domain.ApprovalItem, error) {
	return u.repo.GetPending(ctx)
}

func (u *approvalUC) Approve(ctx context.Context, id uuid.UUID, feedback string, plan []byte) error {
	item, err := u.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if item.Status != "pending" {
		return domain.ErrApprovalResolved
	}
	return u.repo.Resolve(ctx, id, "approved", feedback, plan)
}

func (u *approvalUC) Reject(ctx context.Context, id uuid.UUID, feedback string) error {
	item, err := u.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if item.Status != "pending" {
		return domain.ErrApprovalResolved
	}
	return u.repo.Resolve(ctx, id, "rejected", feedback, nil)
}
