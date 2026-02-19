package middleware

import (
	"github.com/EkaaPrawiraa/axis-assistant/pkg/apperror"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
)

// APIKeyAuth validates the X-API-Key header (or ?api_key query param)
// against the configured single-owner key. Used for both dashboard and
// agent → backend internal calls.
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
