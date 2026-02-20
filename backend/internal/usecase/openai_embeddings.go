package usecase

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/EkaaPrawiraa/axis-assistant/pkg/apperror"
)

type embeddingService interface {
	Embed(ctx context.Context, apiKey string, input string) ([]float32, error)
}

type openAIEmbeddingService struct {
	baseURL string
	model   string
	client  *http.Client
}

func newOpenAIEmbeddingService() *openAIEmbeddingService {
	return &openAIEmbeddingService{
		baseURL: "https://api.openai.com/v1",
		// Matches pgvector schema in migrations (vector(1536)).
		model:  "text-embedding-3-small",
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

type openAIEmbeddingRequest struct {
	Model string `json:"model"`
	Input string `json:"input"`
}

type openAIEmbeddingResponse struct {
	Data []struct {
		Embedding []float64 `json:"embedding"`
	} `json:"data"`
}

func (s *openAIEmbeddingService) Embed(ctx context.Context, apiKey string, input string) ([]float32, error) {
	if apiKey == "" {
		return nil, apperror.Validation("missing ai_api_key in profile")
	}
	if input == "" {
		return nil, apperror.Validation("embedding input is empty")
	}

	bodyBytes, err := json.Marshal(openAIEmbeddingRequest{Model: s.model, Input: input})
	if err != nil {
		return nil, apperror.Wrap(err, apperror.CodeInternal, "failed to marshal embedding request", http.StatusInternalServerError)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL+"/embeddings", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, apperror.Wrap(err, apperror.CodeInternal, "failed to create embedding request", http.StatusInternalServerError)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, apperror.ExternalError(err, "OpenAI embeddings request failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return nil, apperror.ExternalError(fmt.Errorf("status %d: %s", resp.StatusCode, string(b)), "OpenAI embeddings error")
	}

	var parsed openAIEmbeddingResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, apperror.ExternalError(err, "failed to decode OpenAI embeddings response")
	}
	if len(parsed.Data) == 0 || len(parsed.Data[0].Embedding) == 0 {
		return nil, apperror.ExternalError(fmt.Errorf("missing embedding data"), "OpenAI embeddings returned no embedding")
	}
	// Schema is vector(1536); ensure we don't write/search with a mismatched vector.
	if len(parsed.Data[0].Embedding) != 1536 {
		return nil, apperror.ExternalError(fmt.Errorf("unexpected embedding dimension: %d", len(parsed.Data[0].Embedding)), "OpenAI embeddings dimension mismatch")
	}

	emb := make([]float32, len(parsed.Data[0].Embedding))
	for i, f := range parsed.Data[0].Embedding {
		emb[i] = float32(f)
	}
	return emb, nil
}
