package handler

import (
	"github.com/EkaaPrawiraa/axis-assistant/pkg/apperror"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// parseUUID extracts a UUID path param and writes a 400 response on failure.
func parseUUID(c *gin.Context, param string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(param))
	if err != nil {
		response.BadRequest(c, "invalid uuid: "+param)
		return uuid.Nil, false
	}
	return id, true
}

// parseUUIDString parses a raw string into a UUID.
func parseUUIDString(s string) (uuid.UUID, error) {
	return uuid.Parse(s)
}

// mapDomainError translates any error into the standard envelope.
// If the error is already an *apperror.AppError it is used as-is;
// otherwise a generic 500 is returned.
func mapDomainError(c *gin.Context, err error) {
	ae, ok := err.(*apperror.AppError)
	if ok {
		response.Err(c, ae)
		return
	}
	response.Internal(c, "internal server error")
}
