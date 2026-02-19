package router

import (
	"github.com/EkaaPrawiraa/axis-assistant/internal/delivery/http/handler"
	"github.com/EkaaPrawiraa/axis-assistant/internal/delivery/http/middleware"
	"github.com/gin-gonic/gin"
)

// Handlers aggregates all handler instances for registration.
type Handlers struct {
	Chat       *handler.ChatHandler
	Profile    *handler.ProfileHandler
	Session    *handler.SessionHandler
	Activity   *handler.ActivityHandler
	Reminder   *handler.ReminderHandler
	Approval   *handler.ApprovalHandler
	Memory     *handler.MemoryHandler
	Automation *handler.AutomationHandler
	Internal   *handler.InternalHandler
	AI         *handler.AIHandler
}

// Setup configures all routes on the given gin engine.
func Setup(r *gin.Engine, apiKey string, h Handlers) {
	// Global middleware — order matters
	r.Use(middleware.RequestID())    // assign request ID first
	r.Use(middleware.CORS())
	r.Use(middleware.RequestLogger()) // logger reads request_id
	r.Use(gin.Recovery())

	// Health check (no auth)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// ------------------------------------------------------------------
	// Public API (dashboard-facing) — guarded by API key
	// ------------------------------------------------------------------
	api := r.Group("/api/v1")
	api.Use(middleware.APIKeyAuth(apiKey))
	{
		// Chat
		api.POST("/chat", h.Chat.SendMessage)

		// Voice (Whisper STT)
		api.POST("/voice", h.AI.VoiceTranscribe)

		// AI Models
		api.GET("/models", h.AI.ListModels)

		// Profile
		api.GET("/profile", h.Profile.Get)
		api.PUT("/profile", h.Profile.Update)

		// Sessions
		api.POST("/sessions", h.Session.Create)
		api.GET("/sessions", h.Session.List)
		api.GET("/sessions/:id", h.Session.GetByID)
		api.POST("/sessions/:id/close", h.Session.Close)

		// Activities
		api.GET("/activities", h.Activity.List)

		// Reminders
		api.POST("/reminders", h.Reminder.Create)
		api.GET("/reminders", h.Reminder.List)

		// Approvals
		api.GET("/approvals", h.Approval.GetPending)
		api.POST("/approvals/:id/approve", h.Approval.Approve)
		api.POST("/approvals/:id/reject", h.Approval.Reject)

		// Memory
		api.GET("/memory/search", h.Memory.SearchMemory)
		api.GET("/memory/recent", h.Memory.GetRecent)

		// Automations
		api.POST("/automations", h.Automation.Create)
		api.GET("/automations", h.Automation.List)
		api.PUT("/automations/:id", h.Automation.Update)
		api.DELETE("/automations/:id", h.Automation.Delete)
	}

	// ------------------------------------------------------------------
	// Internal API (agent → backend) — same API key auth
	// ------------------------------------------------------------------
	internal := r.Group("/api/v1/internal")
	internal.Use(middleware.APIKeyAuth(apiKey))
	{
		// Memory
		internal.POST("/memory/short-term", h.Memory.StoreShortTerm)
		internal.GET("/memory/short-term/:session_id", h.Memory.GetConversation)
		internal.POST("/memory/long-term", h.Memory.StoreLongTerm)
		internal.POST("/memory/search", h.Memory.VectorSearch)

		// Activity Logging
		internal.POST("/activity", h.Internal.LogActivity)

		// Approval
		internal.POST("/approval", h.Internal.CreateApproval)
		internal.GET("/approval/:id", h.Internal.GetApproval)

		// Profile (read-only for context loading)
		internal.GET("/profile", h.Internal.GetProfile)

		// Reminder (agent can create reminders)
		internal.POST("/reminder", h.Internal.CreateReminder)
	}
}
