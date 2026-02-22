package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/EkaaPrawiraa/axis-assistant/configs"
	"github.com/EkaaPrawiraa/axis-assistant/internal/delivery/http/handler"
	"github.com/EkaaPrawiraa/axis-assistant/internal/delivery/http/router"
	"github.com/EkaaPrawiraa/axis-assistant/internal/repository/postgres"
	"github.com/EkaaPrawiraa/axis-assistant/internal/usecase"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/rs/zerolog/log"
)

func main() {
	// ---- Config ----
	cfg, err := configs.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "config: %v\n", err)
		os.Exit(1)
	}

	// ---- Logger ----
	logger.Init(cfg.App.Env)
	log.Info().Str("app", cfg.App.Name).Str("env", cfg.App.Env).Msg("starting")

	// ---- Database ----
	db, err := sqlx.Connect("postgres", cfg.DB.DSN())
	if err != nil {
		log.Fatal().Err(err).Msg("database connection failed")
	}
	defer db.Close()
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// ---- Repositories ----
	ownerProfileRepo := postgres.NewOwnerProfileRepository(db)
	sessionRepo := postgres.NewSessionRepository(db)
	shortMemRepo := postgres.NewShortTermMemoryRepository(db)
	longMemRepo := postgres.NewLongTermMemoryRepository(db)
	activityRepo := postgres.NewActivityLogRepository(db)
	reminderRepo := postgres.NewReminderRepository(db)
	automationRepo := postgres.NewAutomationRuleRepository(db)
	approvalRepo := postgres.NewApprovalRepository(db)
	integrationsRepo := postgres.NewOwnerIntegrationsRepository(db)

	// ---- Usecases ----
	profileUC := usecase.NewProfileUsecase(ownerProfileRepo)
	sessionUC := usecase.NewSessionUsecase(sessionRepo)
	chatUC := usecase.NewChatUsecase(cfg.AI.OrchestratorURL, cfg.App.APIKey)
	memoryUC := usecase.NewMemoryUsecase(shortMemRepo, longMemRepo, ownerProfileRepo)
	activityUC := usecase.NewActivityUsecase(activityRepo)
	automationUC := usecase.NewAutomationUsecase(automationRepo)
	integrationsUC := usecase.NewIntegrationsUsecase(
		integrationsRepo,
		cfg.Google.ClientID,
		cfg.Google.ClientSecret,
		cfg.Google.RedirectURL,
		cfg.X.ClientID,
		cfg.X.ClientSecret,
		cfg.X.RedirectURI,
		cfg.App.DashboardURL,
	)
	toolsUC := usecase.NewToolsUsecase(
		integrationsRepo,
		cfg.Google.ClientID,
		cfg.Google.ClientSecret,
		cfg.Google.RedirectURL,
		cfg.X.ClientID,
		cfg.X.ClientSecret,
		cfg.X.RedirectURI,
		cfg.WhatsApp.BotURL,
	)
	reminderUC := usecase.NewReminderUsecase(reminderRepo, toolsUC)
	approvalUC := usecase.NewApprovalUsecase(approvalRepo, toolsUC, activityUC)

	// ---- Handlers ----
	handlers := router.Handlers{
		Chat:          handler.NewChatHandler(chatUC),
		Profile:       handler.NewProfileHandler(profileUC),
		Session:       handler.NewSessionHandler(sessionUC, memoryUC),
		Activity:      handler.NewActivityHandler(activityUC),
		Reminder:      handler.NewReminderHandler(reminderUC),
		Approval:      handler.NewApprovalHandler(approvalUC),
		Memory:        handler.NewMemoryHandler(memoryUC),
		Automation:    handler.NewAutomationHandler(automationUC),
		Internal:      handler.NewInternalHandler(activityRepo, approvalRepo, profileUC, reminderUC),
		AI:            handler.NewAIHandler(cfg.AI.OrchestratorURL, cfg.App.APIKey),
		Integrations:  handler.NewIntegrationsHandler(integrationsUC, cfg.App.DashboardURL),
		Tools:         handler.NewToolsHandler(toolsUC, activityRepo),
		Documents:     handler.NewDocumentsHandler(cfg.AI.OrchestratorURL, cfg.App.APIKey),
		WhatsAppWeb:   handler.NewWhatsAppWebHandler(cfg.WhatsApp.BotURL),
		WhatsAppInbox: handler.NewWhatsAppInboxHandler(toolsUC, cfg.AI.OrchestratorURL, cfg.App.APIKey),
	}

	// ---- Gin Engine ----
	if cfg.App.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	engine := gin.New()
	router.Setup(engine, cfg.App.APIKey, handlers)

	// ---- Reminder Worker ----
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go reminderWorker(ctx, reminderUC)

	// ---- HTTP Server ----
	srv := &http.Server{
		Addr:         ":" + cfg.App.Port,
		Handler:      engine,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info().Str("port", cfg.App.Port).Msg("listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("server error")
		}
	}()

	// ---- Graceful Shutdown ----
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info().Msg("shutting down")

	cancel() // stop reminder worker

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("forced shutdown")
	}

	log.Info().Msg("stopped")
}

// reminderWorker polls for due reminders every 60 seconds.
func reminderWorker(ctx context.Context, uc interface{ ProcessDue(context.Context) error }) {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	log.Info().Msg("reminder worker started")

	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("reminder worker stopped")
			return
		case <-ticker.C:
			if err := uc.ProcessDue(ctx); err != nil {
				log.Error().Err(err).Msg("reminder worker tick failed")
			}
		}
	}
}
