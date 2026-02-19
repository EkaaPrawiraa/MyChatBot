package usecase

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/apperror"
	"github.com/google/uuid"
)

type chatUsecase struct {
	orchestratorURL string
	apiKey          string
	client          *http.Client
}

func NewChatUsecase(orchestratorURL, apiKey string) domain.ChatUsecase {
	return &chatUsecase{
		orchestratorURL: orchestratorURL,
		apiKey:          apiKey,
		client:          &http.Client{Timeout: 120 * time.Second},
	}
}

type orchestratorReq struct {
	SessionID string `json:"session_id"`
	Message   string `json:"message"`
}

func (u *chatUsecase) SendMessage(ctx context.Context, sessionID uuid.UUID, message string) (*domain.ChatResponse, error) {
	body, err := json.Marshal(orchestratorReq{
		SessionID: sessionID.String(),
		Message:   message,
	})
	if err != nil {
		return nil, apperror.Wrap(err, apperror.CodeInternal, "failed to marshal request", http.StatusInternalServerError)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		u.orchestratorURL+"/orchestrate", bytes.NewReader(body))
	if err != nil {
		return nil, apperror.Wrap(err, apperror.CodeInternal, "failed to create request", http.StatusInternalServerError)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", u.apiKey)

	resp, err := u.client.Do(req)
	if err != nil {
		return nil, apperror.AgentError(err, "orchestrator unreachable")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, apperror.New(apperror.CodeAgentError,
			fmt.Sprintf("orchestrator error (%d): %s", resp.StatusCode, string(respBody)),
			http.StatusBadGateway)
	}

	// Agent wraps responses in an envelope: {"success":true,"data":{...},...}
	var envelope struct {
		Success bool                 `json:"success"`
		Data    domain.ChatResponse  `json:"data"`
		Error   *struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		return nil, apperror.Wrap(err, apperror.CodeAgentError, "failed to decode orchestrator response", http.StatusBadGateway)
	}
	if !envelope.Success && envelope.Error != nil {
		return nil, apperror.New(apperror.CodeAgentError,
			fmt.Sprintf("orchestrator error: %s — %s", envelope.Error.Code, envelope.Error.Message),
			http.StatusBadGateway)
	}
	return &envelope.Data, nil
}
