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
	AIAPIKeyMasked string `json:"ai_api_key_masked"`
}

// Get handles GET /api/v1/profile
func (h *ProfileHandler) Get(c *gin.Context) {
	profile, err := h.uc.GetProfile(c.Request.Context())
	if err != nil {
		mapDomainError(c, err)
		return
	}
	response.OK(c, profileResponse{
		OwnerProfile:   profile,
		AIAPIKeyMasked: profile.AIKeyMasked(),
	})
}

type updateProfileRequest struct {
	Name                  *string `json:"name"`
	Email                 *string `json:"email"`
	PreferredMeetingHours *string `json:"preferred_meeting_hours"`
	FocusHours            *string `json:"focus_hours"`
	CommunicationStyle    *string `json:"communication_style"`
	WorkPattern           *string `json:"work_pattern"`
	AIProvider            *string `json:"ai_provider"`
	AIAPIKey              *string `json:"ai_api_key"`
	AIModel               *string `json:"ai_model"`
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

	if err := h.uc.UpdateProfile(c.Request.Context(), profile); err != nil {
		mapDomainError(c, err)
		return
	}

	response.OK(c, profileResponse{
		OwnerProfile:   profile,
		AIAPIKeyMasked: profile.AIKeyMasked(),
	})
}
