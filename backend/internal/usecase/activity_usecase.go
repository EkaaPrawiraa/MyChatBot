package usecase

import (
	"context"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/google/uuid"
)

type activityUsecase struct {
	repo domain.ActivityLogRepository
}

func NewActivityUsecase(repo domain.ActivityLogRepository) domain.ActivityUsecase {
	return &activityUsecase{repo: repo}
}

func (u *activityUsecase) Log(ctx context.Context, log *domain.ActivityLog) error {
	if log.ID == uuid.Nil {
		log.ID = uuid.New()
	}
	return u.repo.Create(ctx, log)
}

func (u *activityUsecase) GetLogs(ctx context.Context, limit, offset int) ([]domain.ActivityLog, error) {
	return u.repo.List(ctx, limit, offset)
}
