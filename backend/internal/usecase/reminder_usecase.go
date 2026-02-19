package usecase

import (
	"context"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

type reminderUsecase struct {
	repo domain.ReminderRepository
}

func NewReminderUsecase(repo domain.ReminderRepository) domain.ReminderUsecase {
	return &reminderUsecase{repo: repo}
}

func (u *reminderUsecase) Create(ctx context.Context, reminder *domain.Reminder) error {
	if reminder.ID == uuid.Nil {
		reminder.ID = uuid.New()
	}
	return u.repo.Create(ctx, reminder)
}

func (u *reminderUsecase) GetUpcoming(ctx context.Context, limit int) ([]domain.Reminder, error) {
	return u.repo.List(ctx, limit)
}

// ProcessDue fetches all due reminders and marks them as sent.
// In production this would dispatch notifications (email, webhook, etc.).
func (u *reminderUsecase) ProcessDue(ctx context.Context) error {
	due, err := u.repo.GetDue(ctx)
	if err != nil {
		return err
	}

	for _, r := range due {
		// TODO: Dispatch via configured channel (email / push / webhook)
		log.Info().
			Str("reminder_id", r.ID.String()).
			Str("title", r.Title).
			Msg("dispatching due reminder")

		if err := u.repo.MarkSent(ctx, r.ID); err != nil {
			log.Error().Err(err).Str("reminder_id", r.ID.String()).Msg("failed to mark reminder as sent")
		}
	}

	return nil
}
