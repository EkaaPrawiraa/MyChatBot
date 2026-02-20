package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/google/uuid"
)

type approvalUsecase struct {
	repo     domain.ApprovalRepository
	toolsUC  domain.ToolsUsecase
	activity domain.ActivityUsecase
}

func NewApprovalUsecase(repo domain.ApprovalRepository, toolsUC domain.ToolsUsecase, activity domain.ActivityUsecase) domain.ApprovalUsecase {
	return &approvalUsecase{repo: repo, toolsUC: toolsUC, activity: activity}
}

func (u *approvalUsecase) GetPending(ctx context.Context) ([]domain.ApprovalItem, error) {
	return u.repo.GetPending(ctx)
}

type _approvalPlanStep struct {
	Tool  string         `json:"tool"`
	Input map[string]any `json:"input"`
}

func (u *approvalUsecase) executeApprovedPlan(ctx context.Context, item *domain.ApprovalItem, planBytes []byte) error {
	if u.toolsUC == nil {
		return nil
	}

	var steps []_approvalPlanStep
	if err := json.Unmarshal(planBytes, &steps); err != nil {
		return fmt.Errorf("failed to parse approval plan JSON: %w", err)
	}

	if len(steps) == 0 {
		return nil
	}

	for _, s := range steps {
		tool := s.Tool
		input := s.Input
		if input == nil {
			input = map[string]any{}
		}

		var (
			res any
			execErr error
		)

		switch tool {
		case "gmail.send":
			to, _ := input["to"].(string)
			subject, _ := input["subject"].(string)
			body, _ := input["body"].(string)
			res, execErr = u.toolsUC.GmailSend(ctx, to, subject, body)
		case "calendar.create":
			res, execErr = u.toolsUC.CalendarCreate(ctx, input)
		case "calendar.update":
			eventID, _ := input["event_id"].(string)
			if eventID == "" {
				if v, ok := input["eventId"].(string); ok {
					eventID = v
				}
			}
			payload := map[string]any{}
			for k, v := range input {
				if k == "event_id" || k == "eventId" {
					continue
				}
				payload[k] = v
			}
			res, execErr = u.toolsUC.CalendarUpdate(ctx, eventID, payload)
		case "whatsapp.send":
			to, _ := input["to"].(string)
			message, _ := input["message"].(string)
			if message == "" {
				if v, ok := input["body"].(string); ok {
					message = v
				}
			}
			res, execErr = u.toolsUC.WhatsAppSend(ctx, to, message)
		default:
			// Ignore unknown tools for now.
			continue
		}

		// Best-effort activity log so users can see what happened after approval.
		if u.activity != nil {
			toolsUsed, _ := json.Marshal([]string{tool})
			execResults, _ := json.Marshal(map[string]any{
				"approval_id": item.ID.String(),
				"tool":        tool,
				"input":       input,
				"result":      res,
				"error":       func() any { if execErr != nil { return execErr.Error() }; return nil }(),
			})
			_ = u.activity.Log(ctx, &domain.ActivityLog{
				SessionID:        item.SessionID,
				UserQuery:        fmt.Sprintf("approval.execute %s", item.ID.String()),
				Intent:           tool,
				ExecutionPlan:    planBytes,
				ToolsUsed:        toolsUsed,
				ExecutionResults: execResults,
				Success:          execErr == nil,
				ErrorMessage:     func() string { if execErr != nil { return execErr.Error() }; return "" }(),
				LatencyMs:        0,
				TokenUsage:       0,
				CreatedAt:        time.Now(),
			})
		}
	}

	return nil
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
	if err := u.repo.Resolve(ctx, id, "approved", feedback, modifiedPlan); err != nil {
		return err
	}

	planBytes := item.ProposedPlan
	if len(modifiedPlan) > 0 {
		planBytes = modifiedPlan
	}

	// Execute best-effort after approval.
	_ = u.executeApprovedPlan(ctx, item, planBytes)
	return nil
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
