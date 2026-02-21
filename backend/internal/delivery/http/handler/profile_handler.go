package handler

import (
	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
)

type ProfileHandler struct {
	uc domain.ProfileUsecase
}

func NewProfileHandler(uc domain.ProfileUsecase) *ProfileHandler {
	return &ProfileHandler{uc: uc}
}

// profileResponse is the public-facing profile shape.
// AIAPIKey is never exposed; we include a masked version instead.
type profileResponse struct {
	*domain.OwnerProfile
	AIAPIKeyMasked           string          `json:"ai_api_key_masked"`
	AISkill                  string          `json:"ai_skill"`
	SidebarMenus             map[string]bool `json:"sidebar_menus"`
	WhatsAppRequiresApproval bool            `json:"whatsapp_requires_approval"`
}

// Get handles GET /api/v1/profile
func (h *ProfileHandler) Get(c *gin.Context) {
	profile, err := h.uc.GetProfile(c.Request.Context())
	if err != nil {
		mapDomainError(c, err)
		return
	}
	response.OK(c, profileResponse{
		OwnerProfile:             profile,
		AIAPIKeyMasked:           profile.AIKeyMasked(),
		AISkill:                  getAISkillFromPreferences(profile.Preferences),
		SidebarMenus:             getSidebarMenusFromPreferences(profile.Preferences),
		WhatsAppRequiresApproval: getWhatsAppRequiresApprovalFromPreferences(profile.Preferences),
	})
}

type updateProfileRequest struct {
	Name                     *string         `json:"name"`
	Email                    *string         `json:"email"`
	PreferredMeetingHours    *string         `json:"preferred_meeting_hours"`
	FocusHours               *string         `json:"focus_hours"`
	CommunicationStyle       *string         `json:"communication_style"`
	WorkPattern              *string         `json:"work_pattern"`
	AIProvider               *string         `json:"ai_provider"`
	AIAPIKey                 *string         `json:"ai_api_key"`
	AIModel                  *string         `json:"ai_model"`
	AISkill                  *string         `json:"ai_skill"`
	SidebarMenus             map[string]bool `json:"sidebar_menus"`
	WhatsAppRequiresApproval *bool           `json:"whatsapp_requires_approval"`
}

// Update handles PUT /api/v1/profile
func (h *ProfileHandler) Update(c *gin.Context) {
	var req updateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// Fetch current profile, merge non-nil fields.
	profile, err := h.uc.GetProfile(c.Request.Context())
	if err != nil {
		mapDomainError(c, err)
		return
	}

	if req.Name != nil {
		profile.Name = *req.Name
	}
	if req.Email != nil {
		profile.Email = *req.Email
	}
	if req.PreferredMeetingHours != nil {
		profile.PreferredMeetingHours = *req.PreferredMeetingHours
	}
	if req.FocusHours != nil {
		profile.FocusHours = *req.FocusHours
	}
	if req.CommunicationStyle != nil {
		profile.CommunicationStyle = *req.CommunicationStyle
	}
	if req.WorkPattern != nil {
		profile.WorkPattern = *req.WorkPattern
	}
	if req.AIProvider != nil {
		valid := map[string]bool{"openai": true, "anthropic": true, "xai": true}
		if !valid[*req.AIProvider] {
			response.BadRequest(c, "ai_provider must be one of: openai, anthropic, xai")
			return
		}
		profile.AIProvider = *req.AIProvider
	}
	if req.AIAPIKey != nil {
		profile.AIAPIKey = *req.AIAPIKey
	}
	if req.AIModel != nil {
		profile.AIModel = *req.AIModel
	}
	if req.AISkill != nil {
		valid := map[string]bool{"quick": true, "balanced": true, "deep": true}
		if !valid[*req.AISkill] {
			response.BadRequest(c, "ai_skill must be one of: quick, balanced, deep")
			return
		}
		prefs, err := setAISkillInPreferences(profile.Preferences, *req.AISkill)
		if err != nil {
			response.BadRequest(c, "invalid preferences")
			return
		}
		profile.Preferences = prefs
	}
	if req.SidebarMenus != nil {
		// Sanitize: keep only known keys, and never allow hiding chat/settings.
		allowed := map[string]bool{
			"dashboard":   true,
			"chat":        true,
			"activities":  true,
			"calendar":    true,
			"planning":    true,
			"contacts":    true,
			"documents":   true,
			"memory":      true,
			"approvals":   true,
			"automations": true,
			"email":       true,
			"whatsapp":    true,
			"settings":    true,
		}
		clean := map[string]bool{}
		for k, v := range req.SidebarMenus {
			if allowed[k] {
				clean[k] = v
			}
		}
		clean["chat"] = true
		clean["settings"] = true
		prefs, err := setSidebarMenusInPreferences(profile.Preferences, clean)
		if err != nil {
			response.BadRequest(c, "invalid preferences")
			return
		}
		profile.Preferences = prefs
	}
	if req.WhatsAppRequiresApproval != nil {
		prefs, err := setWhatsAppRequiresApprovalInPreferences(profile.Preferences, *req.WhatsAppRequiresApproval)
		if err != nil {
			response.BadRequest(c, "invalid preferences")
			return
		}
		profile.Preferences = prefs
	}

	if err := h.uc.UpdateProfile(c.Request.Context(), profile); err != nil {
		mapDomainError(c, err)
		return
	}

	response.OK(c, profileResponse{
		OwnerProfile:             profile,
		AIAPIKeyMasked:           profile.AIKeyMasked(),
		AISkill:                  getAISkillFromPreferences(profile.Preferences),
		SidebarMenus:             getSidebarMenusFromPreferences(profile.Preferences),
		WhatsAppRequiresApproval: getWhatsAppRequiresApprovalFromPreferences(profile.Preferences),
	})
}
