package router

import (
	"github.com/EkaaPrawiraa/axis-assistant/internal/delivery/http/handler"
	"github.com/EkaaPrawiraa/axis-assistant/internal/delivery/http/middleware"
	"github.com/gin-gonic/gin"
)

// Handlers aggregates all handler instances for registration.
type Handlers struct {
	Chat          *handler.ChatHandler
	Profile       *handler.ProfileHandler
	Session       *handler.SessionHandler
	Activity      *handler.ActivityHandler
	Reminder      *handler.ReminderHandler
	Approval      *handler.ApprovalHandler
	Memory        *handler.MemoryHandler
	Automation    *handler.AutomationHandler
	Internal      *handler.InternalHandler
	AI            *handler.AIHandler
	Integrations  *handler.IntegrationsHandler
	Tools         *handler.ToolsHandler
	Documents     *handler.DocumentsHandler
	WhatsAppWeb   *handler.WhatsAppWebHandler
	WhatsAppInbox *handler.WhatsAppInboxHandler
}

// Setup configures all routes on the given gin engine.
func Setup(r *gin.Engine, apiKey string, h Handlers) {
	// Global middleware — order matters
	r.Use(middleware.RequestID()) // assign request ID first
	r.Use(middleware.CORS())
	r.Use(middleware.RequestLogger()) // logger reads request_id
	r.Use(gin.Recovery())

	// Health check (no auth)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// ------------------------------------------------------------------
	// Public API (dashboard-facing)
	// ------------------------------------------------------------------
	api := r.Group("/api/v1")
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
		api.GET("/sessions/:id/messages", h.Session.GetMessages)
		api.POST("/sessions/:id/close", h.Session.Close)
		api.DELETE("/sessions/:id", h.Session.Delete)

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

		// Integrations (Google OAuth + WhatsApp config)
		api.GET("/integrations/status", h.Integrations.Status)
		api.GET("/integrations/google/connect", h.Integrations.GoogleConnect)
		api.GET("/integrations/google/callback", h.Integrations.GoogleCallback)
		api.POST("/integrations/google/disconnect", h.Integrations.GoogleDisconnect)
		api.PUT("/integrations/whatsapp", h.Integrations.WhatsAppUpsert)
		api.POST("/integrations/whatsapp/disconnect", h.Integrations.WhatsAppDisconnect)
		api.PUT("/integrations/telegram", h.Integrations.TelegramUpsert)
		api.POST("/integrations/telegram/disconnect", h.Integrations.TelegramDisconnect)
		api.PUT("/integrations/discord", h.Integrations.DiscordUpsert)
		api.POST("/integrations/discord/disconnect", h.Integrations.DiscordDisconnect)

		// Gmail (dashboard-facing)
		api.GET("/gmail/unread", h.Tools.GmailUnread)
		api.GET("/gmail/search", h.Tools.GmailSearch)
		api.GET("/gmail/categorized-unread", h.Tools.GmailCategorizedUnread)
		api.POST("/gmail/send", h.Tools.GmailSend)

		// Calendar (dashboard-facing)
		api.GET("/calendar/events", h.Tools.CalendarList)
		api.POST("/calendar/events", h.Tools.CalendarCreate)
		api.PUT("/calendar/events/:eventId", h.Tools.CalendarUpdate)
		api.DELETE("/calendar/events/:eventId", h.Tools.CalendarDelete)
		api.POST("/calendar/freebusy", h.Tools.CalendarFreeBusy)

		// People / Drive / YouTube (dashboard-facing)
		api.GET("/people/search", h.Tools.PeopleSearch)
		api.GET("/drive/search", h.Tools.DriveSearch)
		api.GET("/drive/export", h.Tools.DriveExport)
		api.POST("/drive/create-text", h.Tools.DriveCreateTextFile)
		api.POST("/drive/create-doc", h.Tools.DriveCreateGoogleDoc)
		api.POST("/drive/create-sheet", h.Tools.DriveCreateGoogleSheet)
		api.POST("/documents/summarize", h.Documents.Summarize)
		api.GET("/youtube/analytics", h.Tools.YouTubeAnalytics)

		// WhatsApp (dashboard-facing)
		api.POST("/whatsapp/send", h.Tools.WhatsAppSend)
		api.POST("/telegram/send", h.Tools.TelegramSend)
		api.GET("/telegram/updates", h.Tools.TelegramUpdates)
		api.POST("/discord/webhook/send", h.Tools.DiscordWebhookSend)
		api.GET("/whatsapp/status", h.WhatsAppWeb.Status)
		api.GET("/whatsapp/qr.png", h.WhatsAppWeb.QRPNG)
		api.POST("/whatsapp/logout", h.WhatsAppWeb.Logout)
		api.GET("/whatsapp/inbox", h.WhatsAppInbox.List)
		api.POST("/whatsapp/inbox/:id/suggest", h.WhatsAppInbox.Suggest)
		api.POST("/whatsapp/inbox/:id/send", h.WhatsAppInbox.Send)
	}

	// ------------------------------------------------------------------
	// Internal API (agent → backend) — guarded by service-to-service API key
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

		// Tools (agent -> backend)
		internal.GET("/tools/gmail/unread", h.Tools.GmailUnread)
		internal.GET("/tools/gmail/search", h.Tools.GmailSearch)
		internal.GET("/tools/gmail/categorized-unread", h.Tools.GmailCategorizedUnread)
		internal.POST("/tools/gmail/send", h.Tools.GmailSend)
		internal.GET("/tools/calendar/events", h.Tools.CalendarList)
		internal.POST("/tools/whatsapp/send", h.Tools.WhatsAppSend)
		internal.POST("/tools/whatsapp/inbound", h.Tools.WhatsAppInbound)
		internal.GET("/tools/whatsapp/status", h.WhatsAppWeb.Status)
		internal.POST("/tools/calendar/events", h.Tools.CalendarCreate)
		internal.PUT("/tools/calendar/events/:eventId", h.Tools.CalendarUpdate)
		internal.DELETE("/tools/calendar/events/:eventId", h.Tools.CalendarDelete)
		internal.POST("/tools/calendar/freebusy", h.Tools.CalendarFreeBusy)
		internal.GET("/tools/people/search", h.Tools.PeopleSearch)
		internal.GET("/tools/drive/search", h.Tools.DriveSearch)
		internal.GET("/tools/drive/export", h.Tools.DriveExport)
		internal.POST("/tools/drive/create-text", h.Tools.DriveCreateTextFile)
		internal.POST("/tools/drive/create-doc", h.Tools.DriveCreateGoogleDoc)
		internal.POST("/tools/drive/create-sheet", h.Tools.DriveCreateGoogleSheet)
		internal.GET("/tools/youtube/analytics", h.Tools.YouTubeAnalytics)
	}
}
