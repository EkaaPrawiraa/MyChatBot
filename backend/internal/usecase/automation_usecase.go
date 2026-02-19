package usecase

import (
	"context"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/google/uuid"
)

type automationUsecase struct {
	repo domain.AutomationRuleRepository
}

func NewAutomationUsecase(repo domain.AutomationRuleRepository) domain.AutomationUsecase {
	return &automationUsecase{repo: repo}
}

func (u *automationUsecase) Create(ctx context.Context, rule *domain.AutomationRule) error {
	if rule.ID == uuid.Nil {
		rule.ID = uuid.New()
	}
	return u.repo.Create(ctx, rule)
}

func (u *automationUsecase) List(ctx context.Context) ([]domain.AutomationRule, error) {
	return u.repo.List(ctx)
}

func (u *automationUsecase) Update(ctx context.Context, rule *domain.AutomationRule) error {
	// Verify the rule exists before updating.
	if _, err := u.repo.GetByID(ctx, rule.ID); err != nil {
		return err
	}
	return u.repo.Update(ctx, rule)
}

func (u *automationUsecase) Delete(ctx context.Context, id uuid.UUID) error {
	if _, err := u.repo.GetByID(ctx, id); err != nil {
		return err
	}
	return u.repo.Delete(ctx, id)
}
