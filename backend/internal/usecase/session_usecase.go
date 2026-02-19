package usecase

import (
	"context"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/google/uuid"
)

type sessionUsecase struct {
	repo domain.SessionRepository
}

func NewSessionUsecase(repo domain.SessionRepository) domain.SessionUsecase {
	return &sessionUsecase{repo: repo}
}

func (u *sessionUsecase) Create(ctx context.Context) (*domain.Session, error) {
	s := &domain.Session{
		ID:     uuid.New(),
		Title:  "New Conversation",
		Active: true,
	}
	if err := u.repo.Create(ctx, s); err != nil {
		return nil, err
	}
	return s, nil
}

func (u *sessionUsecase) GetByID(ctx context.Context, id uuid.UUID) (*domain.Session, error) {
	return u.repo.GetByID(ctx, id)
}

func (u *sessionUsecase) List(ctx context.Context, limit int) ([]domain.Session, error) {
	if limit <= 0 {
		limit = 20
	}
	return u.repo.List(ctx, limit)
}

func (u *sessionUsecase) Close(ctx context.Context, id uuid.UUID) error {
	return u.repo.Close(ctx, id)
}
