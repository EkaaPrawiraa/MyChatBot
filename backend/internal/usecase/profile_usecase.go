package usecase

import (
	"context"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
)

type profileUsecase struct {
	repo domain.OwnerProfileRepository
}

func NewProfileUsecase(repo domain.OwnerProfileRepository) domain.ProfileUsecase {
	return &profileUsecase{repo: repo}
}

func (u *profileUsecase) GetProfile(ctx context.Context) (*domain.OwnerProfile, error) {
	return u.repo.Get(ctx)
}

func (u *profileUsecase) UpdateProfile(ctx context.Context, profile *domain.OwnerProfile) error {
	profile.ID = 1 // always the single owner
	return u.repo.Update(ctx, profile)
}
