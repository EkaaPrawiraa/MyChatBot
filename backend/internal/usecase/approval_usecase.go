package usecase

import (
	"context"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/google/uuid"
)

type approvalUsecase struct {
	repo domain.ApprovalRepository
}

func NewApprovalUsecase(repo domain.ApprovalRepository) domain.ApprovalUsecase {
	return &approvalUsecase{repo: repo}
}

func (u *approvalUsecase) GetPending(ctx context.Context) ([]domain.ApprovalItem, error) {
	return u.repo.GetPending(ctx)
}

func (u *approvalUsecase) Approve(ctx context.Context, id uuid.UUID, feedback string, modifiedPlan []byte) error {
	// Verify item exists and is still pending.
	item, err := u.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if item.Status != "pending" {
		return domain.ErrApprovalResolved
	}
	return u.repo.Resolve(ctx, id, "approved", feedback, modifiedPlan)
}

func (u *approvalUsecase) Reject(ctx context.Context, id uuid.UUID, feedback string) error {
	item, err := u.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if item.Status != "pending" {
		return domain.ErrApprovalResolved
	}
	return u.repo.Resolve(ctx, id, "rejected", feedback, nil)
}
