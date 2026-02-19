package handler

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"

	"github.com/EkaaPrawiraa/axis-assistant/pkg/response"
	"github.com/gin-gonic/gin"
)

// AIHandler proxies voice transcription and model listing to the Python agent.
type AIHandler struct {
	orchestratorURL string
	apiKey          string
	client          *http.Client
}

// NewAIHandler creates a handler for AI-specific endpoints (voice, models).
func NewAIHandler(orchestratorURL, apiKey string) *AIHandler {
	return &AIHandler{
		orchestratorURL: orchestratorURL,
		apiKey:          apiKey,
		client:          &http.Client{Timeout: 120 * time.Second},
	}
}

// VoiceTranscribe handles POST /api/v1/voice.
// It forwards the uploaded audio file to the Python agent's /voice endpoint
// which uses OpenAI Whisper for speech-to-text transcription.
func (h *AIHandler) VoiceTranscribe(c *gin.Context) {
	// Read the multipart form — limit to 25 MB (Whisper max)
	if err := c.Request.ParseMultipartForm(25 << 20); err != nil {
		response.BadRequest(c, "failed to parse multipart form: "+err.Error())
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		response.BadRequest(c, "missing required 'file' field in multipart form")
		return
	}
	defer file.Close()

	// Build a pipe to stream the multipart body to the agent
	pr, pw := io.Pipe()
	mw := multipart.NewWriter(pw)

	// Write the file part in a goroutine
	errCh := make(chan error, 1)
	go func() {
		defer pw.Close()
		part, err := mw.CreateFormFile("file", header.Filename)
		if err != nil {
			errCh <- err
			return
		}
		if _, err := io.Copy(part, file); err != nil {
			errCh <- err
			return
		}
		errCh <- mw.Close()
	}()

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodPost,
		h.orchestratorURL+"/voice", pr)
	if err != nil {
		response.Internal(c, "failed to create proxy request")
		return
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("X-API-Key", h.apiKey)
	if rid := c.GetHeader("X-Request-ID"); rid != "" {
		req.Header.Set("X-Request-ID", rid)
	}

	resp, err := h.client.Do(req)
	if err != nil {
		// Check for the pipe write error too
		<-errCh
		response.Internal(c, "voice transcription request failed: "+err.Error())
		return
	}
	defer resp.Body.Close()
	<-errCh // wait for writer goroutine

	// Stream the agent response back to the client
	body, _ := io.ReadAll(resp.Body)
	c.Data(resp.StatusCode, "application/json", body)
}

// ListModels handles GET /api/v1/models.
// It proxies to the Python agent's /models endpoint which returns all
// supported AI providers and their available models.
func (h *AIHandler) ListModels(c *gin.Context) {
	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet,
		h.orchestratorURL+"/models", nil)
	if err != nil {
		response.Internal(c, "failed to create proxy request")
		return
	}
	req.Header.Set("X-API-Key", h.apiKey)
	if rid := c.GetHeader("X-Request-ID"); rid != "" {
		req.Header.Set("X-Request-ID", rid)
	}

	resp, err := h.client.Do(req)
	if err != nil {
		response.Internal(c, fmt.Sprintf("models request failed: %v", err))
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	c.Data(resp.StatusCode, "application/json", body)
}
