package usecase

import (
	"context"
	"strings"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

type reminderUsecase struct {
	repo  domain.ReminderRepository
	tools domain.ToolsUsecase
}

func NewReminderUsecase(repo domain.ReminderRepository, tools domain.ToolsUsecase) domain.ReminderUsecase {
	return &reminderUsecase{repo: repo, tools: tools}
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

func parseSentVia(value string) (channel string, destination string) {
	v := strings.TrimSpace(value)
	if v == "" {
		return "", ""
	}
	parts := strings.SplitN(v, ":", 2)
	channel = strings.ToLower(strings.TrimSpace(parts[0]))
	if len(parts) == 2 {
		destination = strings.TrimSpace(parts[1])
	}
	return channel, destination
}

func reminderMessage(r domain.Reminder) string {
	if strings.TrimSpace(r.Title) == "" {
		return strings.TrimSpace(r.Description)
	}
	if strings.TrimSpace(r.Description) == "" {
		return strings.TrimSpace(r.Title)
	}
	return strings.TrimSpace(r.Title) + "\n\n" + strings.TrimSpace(r.Description)
}

// ProcessDue fetches all due reminders and dispatches them based on sent_via.
func (u *reminderUsecase) ProcessDue(ctx context.Context) error {
	due, err := u.repo.GetDue(ctx)
	if err != nil {
		return err
	}

	for _, r := range due {
		channel, dest := parseSentVia(r.SentVia)
		msg := reminderMessage(r)

		log.Info().
			Str("reminder_id", r.ID.String()).
			Str("title", r.Title).
			Str("sent_via", r.SentVia).
			Msg("dispatching due reminder")

		// Backwards-compatible behavior: if no channel is configured, just mark as sent.
		if channel == "" {
			if err := u.repo.MarkSent(ctx, r.ID); err != nil {
				log.Error().Err(err).Str("reminder_id", r.ID.String()).Msg("failed to mark reminder as sent")
			}
			continue
		}

		// WhatsApp dispatch: sent_via = "whatsapp:<phone>"
		if channel == "whatsapp" {
			if u.tools == nil {
				log.Error().Str("reminder_id", r.ID.String()).Msg("cannot dispatch whatsapp reminder: tools usecase is nil")
				continue
			}
			if strings.TrimSpace(dest) == "" {
				log.Error().Str("reminder_id", r.ID.String()).Msg("cannot dispatch whatsapp reminder: missing destination phone in sent_via")
				// Mark as sent to avoid retry loop with invalid data.
				if err := u.repo.MarkSent(ctx, r.ID); err != nil {
					log.Error().Err(err).Str("reminder_id", r.ID.String()).Msg("failed to mark reminder as sent")
				}
				continue
			}
			if strings.TrimSpace(msg) == "" {
				msg = "Reminder"
			}

			if _, err := u.tools.WhatsAppSend(ctx, dest, msg); err != nil {
				log.Error().Err(err).Str("reminder_id", r.ID.String()).Str("to", dest).Msg("failed to dispatch whatsapp reminder")
				continue
			}

			if err := u.repo.MarkSent(ctx, r.ID); err != nil {
				log.Error().Err(err).Str("reminder_id", r.ID.String()).Msg("failed to mark reminder as sent")
			}
			continue
		}

		// Unknown channel: mark as sent (prevents infinite retries).
		log.Warn().Str("reminder_id", r.ID.String()).Str("channel", channel).Msg("unknown reminder sent_via channel; marking as sent")
		if err := u.repo.MarkSent(ctx, r.ID); err != nil {
			log.Error().Err(err).Str("reminder_id", r.ID.String()).Msg("failed to mark reminder as sent")
		}
	}

	return nil
}
