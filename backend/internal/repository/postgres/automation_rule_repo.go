package postgres

import (
	"context"
	"database/sql"
	"errors"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type automationRuleRepo struct {
	db *sqlx.DB
}

func NewAutomationRuleRepository(db *sqlx.DB) domain.AutomationRuleRepository {
	return &automationRuleRepo{db: db}
}

func (r *automationRuleRepo) Create(ctx context.Context, rule *domain.AutomationRule) error {
	if rule.ID == uuid.Nil {
		rule.ID = uuid.New()
	}
	query := `
		INSERT INTO automation_rules (id, name, trigger_type, condition_json, action_json, enabled, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING created_at, updated_at`
	return r.db.QueryRowxContext(ctx, query,
		rule.ID, rule.Name, rule.TriggerType,
		rule.ConditionJSON, rule.ActionJSON, rule.Enabled,
	).Scan(&rule.CreatedAt, &rule.UpdatedAt)
}

func (r *automationRuleRepo) List(ctx context.Context) ([]domain.AutomationRule, error) {
	var rules []domain.AutomationRule
	err := r.db.SelectContext(ctx, &rules,
		`SELECT * FROM automation_rules ORDER BY created_at DESC`)
	return rules, err
}

func (r *automationRuleRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.AutomationRule, error) {
	var rule domain.AutomationRule
	err := r.db.GetContext(ctx, &rule,
		`SELECT * FROM automation_rules WHERE id = $1`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return &rule, err
}

func (r *automationRuleRepo) Update(ctx context.Context, rule *domain.AutomationRule) error {
	query := `
		UPDATE automation_rules SET
			name = $1, trigger_type = $2, condition_json = $3,
			action_json = $4, enabled = $5, updated_at = NOW()
		WHERE id = $6`
	_, err := r.db.ExecContext(ctx, query,
		rule.Name, rule.TriggerType, rule.ConditionJSON,
		rule.ActionJSON, rule.Enabled, rule.ID)
	return err
}

func (r *automationRuleRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM automation_rules WHERE id = $1`, id)
	return err
}

func (r *automationRuleRepo) GetByTrigger(ctx context.Context, triggerType string) ([]domain.AutomationRule, error) {
	var rules []domain.AutomationRule
	err := r.db.SelectContext(ctx, &rules,
		`SELECT * FROM automation_rules WHERE trigger_type = $1 AND enabled = TRUE`, triggerType)
	return rules, err
}
