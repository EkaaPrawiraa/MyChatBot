package usecase

import (
	"context"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/google/uuid"
)

type memoryUsecase struct {
	shortRepo domain.ShortTermMemoryRepository
	longRepo  domain.LongTermMemoryRepository
}

func NewMemoryUsecase(
	shortRepo domain.ShortTermMemoryRepository,
	longRepo domain.LongTermMemoryRepository,
) domain.MemoryUsecase {
	return &memoryUsecase{shortRepo: shortRepo, longRepo: longRepo}
}

func (u *memoryUsecase) StoreShortTerm(ctx context.Context, mem *domain.ShortTermMemory) error {
	if mem.ID == uuid.Nil {
		mem.ID = uuid.New()
	}
	return u.shortRepo.Store(ctx, mem)
}

func (u *memoryUsecase) GetConversation(ctx context.Context, sessionID uuid.UUID, limit int) ([]domain.ShortTermMemory, error) {
	return u.shortRepo.GetBySession(ctx, sessionID, limit)
}

func (u *memoryUsecase) StoreLongTerm(ctx context.Context, mem *domain.LongTermMemory) error {
	if mem.ID == uuid.Nil {
		mem.ID = uuid.New()
	}
	return u.longRepo.Store(ctx, mem)
}

func (u *memoryUsecase) SearchMemory(ctx context.Context, query string, limit int) ([]domain.LongTermMemory, error) {
	// TODO: generate embedding from query string via OpenAI, then search
	// For now, return recent memories as fallback
	return u.longRepo.GetRecent(ctx, limit)
}

func (u *memoryUsecase) GetRecentMemories(ctx context.Context, limit int) ([]domain.LongTermMemory, error) {
	return u.longRepo.GetRecent(ctx, limit)
}
