package middleware

import (
	"github.com/EkaaPrawiraa/axis-assistant/pkg/apperror"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
)

// APIKeyAuth validates the X-API-Key header (or ?api_key query param)
// against the configured service-to-service API key.
//
// This key is intended for agent ↔ backend internal calls (e.g. /api/v1/internal/*),
// and is NOT the user's AI provider key (e.g. OpenAI key), which should be stored
// in the owner profile.
func APIKeyAuth(apiKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.GetHeader("X-API-Key")
		if key == "" {
			key = c.Query("api_key")
		}

		if key == "" || key != apiKey {
			response.Err(c, apperror.Unauthorized("invalid or missing API key"))
			c.Abort()
			return
		}

		c.Next()
	}
}
