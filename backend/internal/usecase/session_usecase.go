package usecase

import (
	"context"
	"strings"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/google/uuid"
)

type sessionUsecase struct {
	repo domain.SessionRepository
}

func NewSessionUsecase(repo domain.SessionRepository) domain.SessionUsecase {
	return &sessionUsecase{repo: repo}
}


func (u *sessionUsecase) Create(ctx context.Context, title string) (*domain.Session, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		title = "New Conversation"
	}
	if len(title) > 120 {
		title = title[:120]
	}
	s := &domain.Session{
		ID:     uuid.New(),
		Title:  title,
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

func (u *sessionUsecase) Delete(ctx context.Context, id uuid.UUID) error {
	return u.repo.Delete(ctx, id)
}
