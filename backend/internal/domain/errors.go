package domain

import (
	"net/http"

	"github.com/EkaaPrawiraa/axis-assistant/pkg/apperror"
)

// Domain-layer sentinel errors.
// Each carries a structured code so the handler layer can serialise it
// into the standard response envelope without a big switch statement.
var (
	ErrNotFound         = apperror.New(apperror.CodeNotFound, "resource not found", http.StatusNotFound)
	ErrProfileNotFound  = apperror.New(apperror.CodeNotFound, "owner profile not found", http.StatusNotFound)
	ErrApprovalNotFound = apperror.New(apperror.CodeNotFound, "approval item not found", http.StatusNotFound)
	ErrApprovalResolved = apperror.New(apperror.CodeConflict, "approval already resolved", http.StatusConflict)
	ErrSessionNotFound  = apperror.New(apperror.CodeNotFound, "session not found", http.StatusNotFound)
	ErrUnauthorized     = apperror.New(apperror.CodeUnauthorized, "unauthorized", http.StatusUnauthorized)
	ErrInternal         = apperror.New(apperror.CodeInternal, "internal server error", http.StatusInternalServerError)
)
