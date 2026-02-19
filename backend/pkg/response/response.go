package response

import (
	"net/http"
	"time"

	"github.com/EkaaPrawiraa/axis-assistant/pkg/apperror"
	"github.com/gin-gonic/gin"
)

// --------- Standard Envelope ---------
//
// Every JSON response uses this shape so consumers (frontend, agent, logs)
// can parse errors uniformly.
//
//	{
//	  "success": true,
//	  "data":    { ... },
//	  "error":   null,
//	  "meta":    { "request_id": "...", "timestamp": "..." }
//	}

// Envelope is the top-level JSON envelope.
type Envelope struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *ErrorBody  `json:"error,omitempty"`
	Meta    Meta        `json:"meta"`
}

// ErrorBody is the structured error portion of the envelope.
type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Meta carries request-scoped telemetry.
type Meta struct {
	RequestID string `json:"request_id"`
	Timestamp string `json:"timestamp"`
}

// --------- Internal helpers ---------

func meta(c *gin.Context) Meta {
	rid, _ := c.Get("request_id")
	ridStr, _ := rid.(string)
	return Meta{
		RequestID: ridStr,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
}

// --------- Success helpers ---------

// JSON sends a success envelope.
func JSON(c *gin.Context, status int, data interface{}) {
	c.JSON(status, Envelope{
		Success: true,
		Data:    data,
		Meta:    meta(c),
	})
}

// OK sends 200 + data.
func OK(c *gin.Context, data interface{}) {
	JSON(c, http.StatusOK, data)
}

// Created sends 201 + data.
func Created(c *gin.Context, data interface{}) {
	JSON(c, http.StatusCreated, data)
}

// NoContent sends 204 with empty body.
func NoContent(c *gin.Context) {
	c.Status(http.StatusNoContent)
}

// --------- Error helpers ---------

// Err sends a structured error envelope.  If the error is an *apperror.AppError
// the code and status are used directly; otherwise a generic internal error is sent.
func Err(c *gin.Context, err error) {
	ae, ok := err.(*apperror.AppError)
	if !ok {
		ae = apperror.Internal("internal server error")
	}
	c.JSON(ae.Status, Envelope{
		Success: false,
		Error:   &ErrorBody{Code: ae.Code, Message: ae.Message},
		Meta:    meta(c),
	})
}

// ErrMsg sends a quick error without wrapping in apperror manually.
func ErrMsg(c *gin.Context, status int, code, message string) {
	c.JSON(status, Envelope{
		Success: false,
		Error:   &ErrorBody{Code: code, Message: message},
		Meta:    meta(c),
	})
}

// --------- Shortcut error helpers (backwards-compat + convenience) ---------

// BadRequest sends 400 with the validation error code.
func BadRequest(c *gin.Context, message string) {
	ErrMsg(c, http.StatusBadRequest, apperror.CodeValidation, message)
}

// NotFound sends 404 with the not_found code.
func NotFound(c *gin.Context, message string) {
	ErrMsg(c, http.StatusNotFound, apperror.CodeNotFound, message)
}

// Internal sends 500 with the internal_error code.
func Internal(c *gin.Context, message string) {
	ErrMsg(c, http.StatusInternalServerError, apperror.CodeInternal, message)
}

