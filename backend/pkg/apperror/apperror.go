// Package apperror provides structured, traceable error codes used across
// the Axis Assistant backend.  Every error carries:
//
//   - Code   – a dot-separated identifier  (e.g. "backend.not_found")
//   - Message – a human-readable description
//   - Status  – the HTTP status code the handler layer should use
//
// Code grammar:
//
//	<service>.<category>
//
// Services:
//
//	backend  – Go API / domain / repository
//	agent    – Python AI orchestrator
//	external – third-party APIs (Gmail, Calendar, OpenAI, etc.)
//
// Categories:
//
//	unauthorized        – missing or invalid credentials
//	forbidden           – authenticated but not permitted
//	not_found           – resource does not exist
//	validation_error    – bad input / failed precondition
//	conflict            – state conflict (e.g. approval already resolved)
//	internal_error      – unexpected / unrecoverable
//	db_error            – database layer failure
//	agent_error         – orchestrator unreachable / malformed response
//	llm_error           – LLM provider failure
//	external_error      – third-party service failure
//	timeout             – operation timed out
package apperror

import (
	"fmt"
	"net/http"
)

// --------- Error Codes ---------

const (
	CodeUnauthorized    = "backend.unauthorized"
	CodeForbidden       = "backend.forbidden"
	CodeNotFound        = "backend.not_found"
	CodeValidation      = "backend.validation_error"
	CodeConflict        = "backend.conflict"
	CodeInternal        = "backend.internal_error"
	CodeDBError         = "backend.db_error"
	CodeAgentError      = "backend.agent_error"
	CodeTimeout         = "backend.timeout"
	CodeExternalError   = "external.external_error"
	CodeLLMError        = "agent.llm_error"
	CodeIntentFailed    = "agent.intent_failed"
	CodePlanningFailed  = "agent.planning_failed"
	CodeExecFailed      = "agent.execution_failed"
	CodeGuardrailBlock  = "agent.guardrail_blocked"
)

// --------- AppError ---------

// AppError is the canonical error type returned by all backend layers.
type AppError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Status  int    `json:"-"` // HTTP status — never serialised
	Err     error  `json:"-"` // wrapped cause — never serialised
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error { return e.Err }

// --------- Constructors ---------

// New creates a fresh AppError without a cause.
func New(code, message string, status int) *AppError {
	return &AppError{Code: code, Message: message, Status: status}
}

// Wrap wraps an existing error with application context.
func Wrap(err error, code, message string, status int) *AppError {
	return &AppError{Code: code, Message: message, Status: status, Err: err}
}

// --------- Convenience helpers ---------

func Unauthorized(msg string) *AppError {
	return New(CodeUnauthorized, msg, http.StatusUnauthorized)
}

func NotFound(msg string) *AppError {
	return New(CodeNotFound, msg, http.StatusNotFound)
}

func Validation(msg string) *AppError {
	return New(CodeValidation, msg, http.StatusBadRequest)
}

func Conflict(msg string) *AppError {
	return New(CodeConflict, msg, http.StatusConflict)
}

func Internal(msg string) *AppError {
	return New(CodeInternal, msg, http.StatusInternalServerError)
}

func DBError(err error, msg string) *AppError {
	return Wrap(err, CodeDBError, msg, http.StatusInternalServerError)
}

func AgentError(err error, msg string) *AppError {
	return Wrap(err, CodeAgentError, msg, http.StatusBadGateway)
}

func ExternalError(err error, msg string) *AppError {
	return Wrap(err, CodeExternalError, msg, http.StatusBadGateway)
}
