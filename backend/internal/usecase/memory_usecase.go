package usecase

import (
	"context"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

type memoryUsecase struct {
	shortRepo domain.ShortTermMemoryRepository
	longRepo  domain.LongTermMemoryRepository
	profile   domain.OwnerProfileRepository
	embeddings embeddingService
}

func NewMemoryUsecase(
	shortRepo domain.ShortTermMemoryRepository,
	longRepo domain.LongTermMemoryRepository,
	profileRepo domain.OwnerProfileRepository,
) domain.MemoryUsecase {
	return &memoryUsecase{
		shortRepo:  shortRepo,
		longRepo:   longRepo,
		profile:    profileRepo,
		embeddings: newOpenAIEmbeddingService(),
	}
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

	// Generate and persist embedding server-side using the owner's saved ai_api_key.
	// If embedding fails, we still store the content (embedding will be NULL) so the
	// system remains usable; semantic search will skip NULL embeddings.
	if mem.Content != "" && len(mem.Embedding) == 0 {
		profile, err := u.profile.Get(ctx)
		if err != nil {
			return err
		}
		emb, err := u.embeddings.Embed(ctx, profile.AIAPIKey, mem.Content)
		if err != nil {
			log.Warn().Err(err).Msg("failed to embed long-term memory; storing without embedding")
		} else {
			mem.Embedding = emb
		}
	}
	return u.longRepo.Store(ctx, mem)
}

func (u *memoryUsecase) SearchMemory(ctx context.Context, query string, limit int) ([]domain.LongTermMemory, error) {
	profile, err := u.profile.Get(ctx)
	if err != nil {
		return nil, err
	}

	emb, err := u.embeddings.Embed(ctx, profile.AIAPIKey, query)
	if err != nil {
		log.Warn().Err(err).Msg("failed to embed query; falling back to recent long-term memories")
		return u.longRepo.GetRecent(ctx, limit)
	}

	results, err := u.longRepo.SearchSimilar(ctx, emb, limit)
	if err != nil {
		return nil, err
	}
	return results, nil
}

func (u *memoryUsecase) GetRecentMemories(ctx context.Context, limit int) ([]domain.LongTermMemory, error) {
	return u.longRepo.GetRecent(ctx, limit)
}
