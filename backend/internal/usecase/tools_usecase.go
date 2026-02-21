package usecase

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/EkaaPrawiraa/axis-assistant/internal/domain"
	"github.com/EkaaPrawiraa/axis-assistant/pkg/apperror"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

func normalizeCalendarEventPayload(payload map[string]any) map[string]any {
	if payload == nil {
		return map[string]any{}
	}

	n := make(map[string]any, len(payload)+4)
	for k, v := range payload {
		n[k] = v
	}

	// Allow simpler keys from the planner.
	if _, ok := n["summary"]; !ok {
		if title, ok2 := n["title"].(string); ok2 {
			n["summary"] = title
			delete(n, "title")
		}
	}

	if startVal, ok := n["start"]; ok {
		if startStr, ok2 := startVal.(string); ok2 {
			n["start"] = map[string]any{"dateTime": startStr}
		}
	}
	if endVal, ok := n["end"]; ok {
		if endStr, ok2 := endVal.(string); ok2 {
			n["end"] = map[string]any{"dateTime": endStr}
		}
	}

	return n
}

type toolsUsecase struct {
	integrations   domain.OwnerIntegrationsRepository
	clientID       string
	clientSecret   string
	redirectURL    string
	whatsAppBotURL string
	httpClient     *http.Client
}

func NewToolsUsecase(
	integrations domain.OwnerIntegrationsRepository,
	clientID, clientSecret, redirectURL, whatsAppBotURL string,
) domain.ToolsUsecase {
	return &toolsUsecase{
		integrations:   integrations,
		clientID:       clientID,
		clientSecret:   clientSecret,
		redirectURL:    redirectURL,
		whatsAppBotURL: strings.TrimRight(whatsAppBotURL, "/"),
		httpClient:     &http.Client{Timeout: 30 * time.Second},
	}
}

func (u *toolsUsecase) oauthConfig() (*oauth2.Config, error) {
	if u.clientID == "" || u.clientSecret == "" || u.redirectURL == "" {
		return nil, apperror.Validation("Google OAuth is not configured (GOOGLE_CLIENT_ID/SECRET/REDIRECT_URL)")
	}
	return &oauth2.Config{
		ClientID:     u.clientID,
		ClientSecret: u.clientSecret,
		RedirectURL:  u.redirectURL,
		Scopes: []string{
			"openid",
			"email",
			"profile",
			"https://www.googleapis.com/auth/gmail.readonly",
			"https://www.googleapis.com/auth/gmail.send",
			"https://www.googleapis.com/auth/calendar",
			"https://www.googleapis.com/auth/contacts.readonly",
			"https://www.googleapis.com/auth/drive.readonly",
			"https://www.googleapis.com/auth/drive.file",
			"https://www.googleapis.com/auth/documents",
			"https://www.googleapis.com/auth/spreadsheets",
			"https://www.googleapis.com/auth/youtube.readonly",
			"https://www.googleapis.com/auth/yt-analytics.readonly",
		},
		Endpoint: google.Endpoint,
	}, nil
}

func randomRequestID() string {
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("req-%d", time.Now().UnixNano())
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

func isTruthy(v any) bool {
	switch t := v.(type) {
	case bool:
		return t
	case string:
		return strings.EqualFold(strings.TrimSpace(t), "true") || strings.TrimSpace(t) == "1" || strings.EqualFold(strings.TrimSpace(t), "yes")
	case float64:
		return t != 0
	case int:
		return t != 0
	default:
		return false
	}
}

func (u *toolsUsecase) getGoogleAccessToken(ctx context.Context) (string, error) {
	integ, err := u.integrations.Get(ctx)
	if err != nil {
		return "", err
	}
	if strings.TrimSpace(integ.GoogleRefreshToken) == "" {
		return "", apperror.Validation("Google is not connected")
	}

	// Use cached access token if still valid.
	if strings.TrimSpace(integ.GoogleAccessToken) != "" && !integ.GoogleTokenExpiry.IsZero() {
		if time.Until(integ.GoogleTokenExpiry) > 60*time.Second {
			return integ.GoogleAccessToken, nil
		}
	}

	cfg, err := u.oauthConfig()
	if err != nil {
		return "", err
	}

	ts := cfg.TokenSource(ctx, &oauth2.Token{RefreshToken: integ.GoogleRefreshToken})
	tok, err := ts.Token()
	if err != nil {
		return "", apperror.ExternalError(err, "failed to refresh Google access token")
	}

	var expiry *time.Time
	if !tok.Expiry.IsZero() {
		e := tok.Expiry
		expiry = &e
	}
	// Persist refreshed access token for later calls.
	_ = u.integrations.UpsertGoogle(ctx, integ.GoogleEmail, "", tok.AccessToken, expiry)

	return tok.AccessToken, nil
}

func (u *toolsUsecase) doJSON(ctx context.Context, method, rawURL string, body any, headers map[string]string) (any, error) {
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, apperror.Wrap(err, apperror.CodeInternal, "failed to marshal request", http.StatusInternalServerError)
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, rawURL, reqBody)
	if err != nil {
		return nil, apperror.Wrap(err, apperror.CodeInternal, "failed to create request", http.StatusInternalServerError)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := u.httpClient.Do(req)
	if err != nil {
		return nil, apperror.ExternalError(err, "external request failed")
	}
	defer resp.Body.Close()

	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		msg := formatExternalAPIErrorMessage(method, rawURL, resp.StatusCode, b)
		return nil, apperror.ExternalError(fmt.Errorf("status %d: %s", resp.StatusCode, truncateForLogs(b, 4000)), msg)
	}

	var parsed any
	if len(b) == 0 {
		return map[string]any{"ok": true}, nil
	}
	if err := json.Unmarshal(b, &parsed); err != nil {
		// Fallback: return raw string.
		return map[string]any{"raw": string(b)}, nil
	}
	return parsed, nil
}

func truncateForLogs(b []byte, max int) string {
	if max <= 0 {
		max = 4000
	}
	if len(b) <= max {
		return string(b)
	}
	return string(b[:max]) + "…(truncated)"
}

func formatExternalAPIErrorMessage(method, rawURL string, status int, body []byte) string {
	// Keep this message safe + user-readable: it will be returned to the frontend.
	host := "external"
	if u, err := url.Parse(rawURL); err == nil {
		if u.Host != "" {
			host = u.Host
		}
	}

	providerMsg := extractJSONErrorMessage(body)
	if providerMsg != "" {
		return fmt.Sprintf("external api error (%s %s, %d): %s", method, host, status, providerMsg)
	}

	if len(bytes.TrimSpace(body)) > 0 {
		return fmt.Sprintf("external api error (%s %s, %d): %s", method, host, status, truncateForLogs(bytes.TrimSpace(body), 250))
	}

	return fmt.Sprintf("external api error (%s %s, %d)", method, host, status)
}

func extractJSONErrorMessage(body []byte) string {
	trim := bytes.TrimSpace(body)
	if len(trim) == 0 {
		return ""
	}

	var m map[string]any
	if err := json.Unmarshal(trim, &m); err != nil {
		return ""
	}

	// Common FastAPI shape: {"detail":"Not Found"}
	if v, ok := m["detail"].(string); ok {
		return strings.TrimSpace(v)
	}

	// Common REST shape: {"message":"..."}
	if v, ok := m["message"].(string); ok {
		return strings.TrimSpace(v)
	}

	// Google APIs: {"error": {"message":"...", "status":"...", "code":403}}
	if errAny, ok := m["error"]; ok {
		if em, ok := errAny.(map[string]any); ok {
			msg, _ := em["message"].(string)
			msg = strings.TrimSpace(msg)
			st, _ := em["status"].(string)
			st = strings.TrimSpace(st)
			if st != "" && msg != "" {
				return st + ": " + msg
			}
			if msg != "" {
				return msg
			}
		}
	}

	return ""
}

func (u *toolsUsecase) GmailUnread(ctx context.Context, maxResults int) (int, error) {
	if maxResults <= 0 {
		maxResults = 50
	}
	accessToken, err := u.getGoogleAccessToken(ctx)
	if err != nil {
		return 0, err
	}

	q := url.Values{}
	q.Set("q", "is:unread")
	q.Set("maxResults", fmt.Sprintf("%d", maxResults))
	endpoint := "https://gmail.googleapis.com/gmail/v1/users/me/messages?" + q.Encode()

	resp, err := u.doJSON(ctx, http.MethodGet, endpoint, nil, map[string]string{"Authorization": "Bearer " + accessToken})
	if err != nil {
		return 0, err
	}

	m, _ := resp.(map[string]any)
	if m == nil {
		return 0, nil
	}
	if v, ok := m["resultSizeEstimate"].(float64); ok {
		return int(v), nil
	}
	return 0, nil
}

func (u *toolsUsecase) GmailSearch(ctx context.Context, query string, maxResults int) (any, error) {
	if strings.TrimSpace(query) == "" {
		return nil, apperror.Validation("query is required")
	}
	if maxResults <= 0 {
		maxResults = 10
	}
	accessToken, err := u.getGoogleAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	q := url.Values{}
	q.Set("q", query)
	q.Set("maxResults", fmt.Sprintf("%d", maxResults))
	listURL := "https://gmail.googleapis.com/gmail/v1/users/me/messages?" + q.Encode()

	listResp, err := u.doJSON(ctx, http.MethodGet, listURL, nil, map[string]string{"Authorization": "Bearer " + accessToken})
	if err != nil {
		return nil, err
	}

	listMap, _ := listResp.(map[string]any)
	msgs, _ := listMap["messages"].([]any)
	results := make([]any, 0)

	for _, item := range msgs {
		im, _ := item.(map[string]any)
		id, _ := im["id"].(string)
		if id == "" {
			continue
		}
		detailURL := "https://gmail.googleapis.com/gmail/v1/users/me/messages/" + id + "?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date"
		detail, err := u.doJSON(ctx, http.MethodGet, detailURL, nil, map[string]string{"Authorization": "Bearer " + accessToken})
		if err != nil {
			return nil, err
		}
		results = append(results, detail)
	}

	return map[string]any{
		"query":    query,
		"count":    len(results),
		"messages": results,
	}, nil
}

func (u *toolsUsecase) GmailCategorizedUnread(ctx context.Context, maxResults int) (any, error) {
	if maxResults <= 0 {
		maxResults = 10
	}

	categories := []string{"primary", "social", "promotions", "updates", "forums"}
	res := make(map[string]any, len(categories))
	for _, cat := range categories {
		q := fmt.Sprintf("category:%s is:unread", cat)
		data, err := u.GmailSearch(ctx, q, maxResults)
		if err != nil {
			return nil, err
		}
		res[cat] = data
	}
	return map[string]any{"categories": res}, nil
}

func (u *toolsUsecase) GmailSend(ctx context.Context, to, subject, body string) (any, error) {
	if strings.TrimSpace(to) == "" {
		return nil, apperror.Validation("to is required")
	}
	accessToken, err := u.getGoogleAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	mime := "" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/plain; charset=\"UTF-8\"\r\n" +
		"Content-Transfer-Encoding: 7bit\r\n" +
		"\r\n" +
		body + "\r\n"

	raw := base64.RawURLEncoding.EncodeToString([]byte(mime))
	sendURL := "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"

	resp, err := u.doJSON(ctx, http.MethodPost, sendURL, map[string]any{"raw": raw}, map[string]string{"Authorization": "Bearer " + accessToken})
	if err != nil {
		return nil, err
	}
	return resp, nil
}

func (u *toolsUsecase) CalendarList(ctx context.Context, timeMin, timeMax string, maxResults int) (any, error) {
	if maxResults <= 0 {
		maxResults = 20
	}
	accessToken, err := u.getGoogleAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	q := url.Values{}
	if strings.TrimSpace(timeMin) != "" {
		q.Set("timeMin", timeMin)
	}
	if strings.TrimSpace(timeMax) != "" {
		q.Set("timeMax", timeMax)
	}
	q.Set("singleEvents", "true")
	q.Set("orderBy", "startTime")
	q.Set("maxResults", fmt.Sprintf("%d", maxResults))

	listURL := "https://www.googleapis.com/calendar/v3/calendars/primary/events?" + q.Encode()
	return u.doJSON(ctx, http.MethodGet, listURL, nil, map[string]string{"Authorization": "Bearer " + accessToken})
}

func (u *toolsUsecase) CalendarCreate(ctx context.Context, payload map[string]any) (any, error) {
	accessToken, err := u.getGoogleAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	normalized := normalizeCalendarEventPayload(payload)
	createMeet := false
	if payload != nil {
		if v, ok := payload["create_meet"]; ok {
			createMeet = isTruthy(v)
		}
		if v, ok := payload["createMeet"]; ok {
			createMeet = createMeet || isTruthy(v)
		}
	}

	createURL := "https://www.googleapis.com/calendar/v3/calendars/primary/events"
	if createMeet {
		createURL += "?conferenceDataVersion=1"
		if _, ok := normalized["conferenceData"]; !ok {
			normalized["conferenceData"] = map[string]any{
				"createRequest": map[string]any{
					"requestId": randomRequestID(),
					"conferenceSolutionKey": map[string]any{
						"type": "hangoutsMeet",
					},
				},
			}
		}
		delete(normalized, "create_meet")
		delete(normalized, "createMeet")
	}

	return u.doJSON(ctx, http.MethodPost, createURL, normalized, map[string]string{"Authorization": "Bearer " + accessToken})
}

func (u *toolsUsecase) CalendarUpdate(ctx context.Context, eventID string, payload map[string]any) (any, error) {
	if strings.TrimSpace(eventID) == "" {
		return nil, apperror.Validation("event_id is required")
	}
	accessToken, err := u.getGoogleAccessToken(ctx)
	if err != nil {
		return nil, err
	}
	updateURL := "https://www.googleapis.com/calendar/v3/calendars/primary/events/" + url.PathEscape(eventID)
	return u.doJSON(ctx, http.MethodPut, updateURL, normalizeCalendarEventPayload(payload), map[string]string{"Authorization": "Bearer " + accessToken})
}

func (u *toolsUsecase) CalendarDelete(ctx context.Context, eventID string) (any, error) {
	if strings.TrimSpace(eventID) == "" {
		return nil, apperror.Validation("event_id is required")
	}
	accessToken, err := u.getGoogleAccessToken(ctx)
	if err != nil {
		return nil, err
	}
	deleteURL := "https://www.googleapis.com/calendar/v3/calendars/primary/events/" + url.PathEscape(eventID)
	return u.doJSON(ctx, http.MethodDelete, deleteURL, nil, map[string]string{"Authorization": "Bearer " + accessToken})
}

func (u *toolsUsecase) CalendarFreeBusy(ctx context.Context, timeMin, timeMax string) (any, error) {
	if strings.TrimSpace(timeMin) == "" || strings.TrimSpace(timeMax) == "" {
		return nil, apperror.Validation("timeMin and timeMax are required")
	}
	accessToken, err := u.getGoogleAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	fbURL := "https://www.googleapis.com/calendar/v3/freeBusy"
	payload := map[string]any{
		"timeMin": timeMin,
		"timeMax": timeMax,
		"items":   []map[string]any{{"id": "primary"}},
	}
	return u.doJSON(ctx, http.MethodPost, fbURL, payload, map[string]string{"Authorization": "Bearer " + accessToken})
}

func (u *toolsUsecase) PeopleSearch(ctx context.Context, query string, pageSize int, pageToken string) (any, error) {
	if strings.TrimSpace(query) == "" {
		return nil, apperror.Validation("query is required")
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	accessToken, err := u.getGoogleAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	q := url.Values{}
	q.Set("query", query)
	q.Set("pageSize", fmt.Sprintf("%d", pageSize))
	q.Set("readMask", "names,phoneNumbers")
	if strings.TrimSpace(pageToken) != "" {
		q.Set("pageToken", pageToken)
	}

	endpoint := "https://people.googleapis.com/v1/people:searchContacts?" + q.Encode()
	return u.doJSON(ctx, http.MethodGet, endpoint, nil, map[string]string{"Authorization": "Bearer " + accessToken})
}

func escapeDriveQueryString(s string) string {
	return strings.ReplaceAll(s, "'", "\\'")
}

func (u *toolsUsecase) DriveSearch(ctx context.Context, query string, pageSize int, pageToken string) (any, error) {
	if pageSize <= 0 {
		pageSize = 10
	}
	accessToken, err := u.getGoogleAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	driveQ := "trashed=false"
	if strings.TrimSpace(query) != "" {
		qv := escapeDriveQueryString(strings.TrimSpace(query))
		driveQ = fmt.Sprintf("name contains '%s' and trashed=false", qv)
	}

	q := url.Values{}
	q.Set("q", driveQ)
	q.Set("pageSize", fmt.Sprintf("%d", pageSize))
	q.Set("fields", "nextPageToken,files(id,name,mimeType,webViewLink,modifiedTime,size)")
	if strings.TrimSpace(pageToken) != "" {
		q.Set("pageToken", pageToken)
	}

	endpoint := "https://www.googleapis.com/drive/v3/files?" + q.Encode()
	return u.doJSON(ctx, http.MethodGet, endpoint, nil, map[string]string{"Authorization": "Bearer " + accessToken})
}

func (u *toolsUsecase) DriveExport(ctx context.Context, fileID string, mimeType string, maxBytes int) (any, error) {
	if strings.TrimSpace(fileID) == "" {
		return nil, apperror.Validation("fileId is required")
	}
	if strings.TrimSpace(mimeType) == "" {
		mimeType = "text/plain"
	}
	if maxBytes <= 0 {
		maxBytes = 20000
	}

	accessToken, err := u.getGoogleAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	q := url.Values{}
	q.Set("mimeType", mimeType)
	endpoint := fmt.Sprintf("https://www.googleapis.com/drive/v3/files/%s/export?%s", url.PathEscape(fileID), q.Encode())

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, apperror.Wrap(err, apperror.CodeInternal, "failed to create drive export request", http.StatusInternalServerError)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := u.httpClient.Do(req)
	if err != nil {
		return nil, apperror.ExternalError(err, "drive export request failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return nil, apperror.ExternalError(fmt.Errorf("status %d: %s", resp.StatusCode, string(b)), "drive export returned error")
	}

	limited := io.LimitReader(resp.Body, int64(maxBytes)+1)
	b, err := io.ReadAll(limited)
	if err != nil {
		return nil, apperror.ExternalError(err, "failed to read drive export body")
	}

	truncated := len(b) > maxBytes
	if truncated {
		b = b[:maxBytes]
	}

	text := string(b)
	// Avoid returning invalid UTF-8 (can break JSON clients).
	if !utf8.ValidString(text) {
		text = string(bytes.ToValidUTF8(b, []byte("")))
	}

	return map[string]any{
		"file_id":   fileID,
		"mime_type": mimeType,
		"text":      text,
		"truncated": truncated,
		"max_bytes": maxBytes,
	}, nil
}

func (u *toolsUsecase) DriveCreateTextFile(ctx context.Context, name string, content string, mimeType string, parentID string) (any, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, apperror.Validation("name is required")
	}
	if strings.TrimSpace(mimeType) == "" {
		mimeType = "text/plain"
	}

	accessToken, err := u.getGoogleAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	metadata := map[string]any{
		"name":     name,
		"mimeType": mimeType,
	}
	if strings.TrimSpace(parentID) != "" {
		metadata["parents"] = []string{strings.TrimSpace(parentID)}
	}

	metaJSON, err := json.Marshal(metadata)
	if err != nil {
		return nil, apperror.Wrap(err, apperror.CodeInternal, "failed to marshal drive file metadata", http.StatusInternalServerError)
	}

	boundary := "axis-assistant-boundary-" + randomRequestID()
	var body bytes.Buffer
	body.WriteString("--" + boundary + "\r\n")
	body.WriteString("Content-Type: application/json; charset=UTF-8\r\n\r\n")
	body.Write(metaJSON)
	body.WriteString("\r\n")
	body.WriteString("--" + boundary + "\r\n")
	body.WriteString("Content-Type: " + mimeType + "\r\n\r\n")
	body.WriteString(content)
	body.WriteString("\r\n")
	body.WriteString("--" + boundary + "--\r\n")

	q := url.Values{}
	q.Set("uploadType", "multipart")
	q.Set("fields", "id,name,mimeType,webViewLink")
	endpoint := "https://www.googleapis.com/upload/drive/v3/files?" + q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, &body)
	if err != nil {
		return nil, apperror.Wrap(err, apperror.CodeInternal, "failed to create drive upload request", http.StatusInternalServerError)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", fmt.Sprintf("multipart/related; boundary=%s", boundary))

	resp, err := u.httpClient.Do(req)
	if err != nil {
		return nil, apperror.ExternalError(err, "drive upload request failed")
	}
	defer resp.Body.Close()

	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, apperror.ExternalError(fmt.Errorf("status %d: %s", resp.StatusCode, string(b)), "drive upload returned error")
	}

	var parsed any
	if err := json.Unmarshal(b, &parsed); err != nil {
		return map[string]any{"raw": string(b)}, nil
	}
	return parsed, nil
}

func (u *toolsUsecase) DriveCreateGoogleDoc(ctx context.Context, name string, content string, parentID string) (any, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, apperror.Validation("name is required")
	}

	accessToken, err := u.getGoogleAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	q := url.Values{}
	q.Set("fields", "id,name,mimeType,webViewLink")
	createURL := "https://www.googleapis.com/drive/v3/files?" + q.Encode()

	meta := map[string]any{
		"name":     name,
		"mimeType": "application/vnd.google-apps.document",
	}
	if strings.TrimSpace(parentID) != "" {
		meta["parents"] = []string{strings.TrimSpace(parentID)}
	}

	createdAny, err := u.doJSON(ctx, http.MethodPost, createURL, meta, map[string]string{"Authorization": "Bearer " + accessToken})
	if err != nil {
		return nil, err
	}
	created, _ := createdAny.(map[string]any)
	fileID, _ := created["id"].(string)
	if strings.TrimSpace(fileID) == "" {
		return nil, apperror.ExternalError(fmt.Errorf("missing file id"), "drive create doc returned invalid response")
	}

	if strings.TrimSpace(content) != "" {
		batchURL := fmt.Sprintf("https://docs.googleapis.com/v1/documents/%s:batchUpdate", url.PathEscape(fileID))
		payload := map[string]any{
			"requests": []map[string]any{
				{
					"insertText": map[string]any{
						"location": map[string]any{"index": 1},
						"text":     content,
					},
				},
			},
		}
		_, err = u.doJSON(ctx, http.MethodPost, batchURL, payload, map[string]string{"Authorization": "Bearer " + accessToken})
		if err != nil {
			return nil, err
		}
	}

	return createdAny, nil
}

func (u *toolsUsecase) DriveCreateGoogleSheet(ctx context.Context, name string, csvContent string, parentID string) (any, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, apperror.Validation("name is required")
	}

	accessToken, err := u.getGoogleAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	q := url.Values{}
	q.Set("fields", "id,name,mimeType,webViewLink")
	createURL := "https://www.googleapis.com/drive/v3/files?" + q.Encode()

	meta := map[string]any{
		"name":     name,
		"mimeType": "application/vnd.google-apps.spreadsheet",
	}
	if strings.TrimSpace(parentID) != "" {
		meta["parents"] = []string{strings.TrimSpace(parentID)}
	}

	createdAny, err := u.doJSON(ctx, http.MethodPost, createURL, meta, map[string]string{"Authorization": "Bearer " + accessToken})
	if err != nil {
		return nil, err
	}
	created, _ := createdAny.(map[string]any)
	fileID, _ := created["id"].(string)
	if strings.TrimSpace(fileID) == "" {
		return nil, apperror.ExternalError(fmt.Errorf("missing file id"), "drive create sheet returned invalid response")
	}

	csvContent = strings.TrimSpace(csvContent)
	if csvContent != "" {
		r := csv.NewReader(strings.NewReader(csvContent))
		records, err := r.ReadAll()
		if err != nil {
			return nil, apperror.Validation("invalid CSV content")
		}

		values := make([][]any, 0, len(records))
		for _, row := range records {
			outRow := make([]any, 0, len(row))
			for _, cell := range row {
				cellTrim := strings.TrimSpace(cell)
				if n, err := strconv.ParseFloat(cellTrim, 64); err == nil && cellTrim != "" {
					outRow = append(outRow, n)
				} else {
					outRow = append(outRow, cell)
				}
			}
			values = append(values, outRow)
		}

		updateURL := fmt.Sprintf(
			"https://sheets.googleapis.com/v4/spreadsheets/%s/values/A1?valueInputOption=RAW",
			url.PathEscape(fileID),
		)
		payload := map[string]any{"values": values}
		_, err = u.doJSON(ctx, http.MethodPut, updateURL, payload, map[string]string{"Authorization": "Bearer " + accessToken})
		if err != nil {
			return nil, err
		}
	}

	return createdAny, nil
}

func (u *toolsUsecase) YouTubeAnalytics(ctx context.Context, startDate string, endDate string) (any, error) {
	if strings.TrimSpace(startDate) == "" || strings.TrimSpace(endDate) == "" {
		return nil, apperror.Validation("startDate and endDate are required (YYYY-MM-DD)")
	}
	accessToken, err := u.getGoogleAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	// YouTube Data API: channel metadata/statistics.
	chQ := url.Values{}
	chQ.Set("part", "snippet,statistics")
	chQ.Set("mine", "true")
	channelsURL := "https://www.googleapis.com/youtube/v3/channels?" + chQ.Encode()
	channels, err := u.doJSON(ctx, http.MethodGet, channelsURL, nil, map[string]string{"Authorization": "Bearer " + accessToken})
	if err != nil {
		return nil, err
	}

	// YouTube Analytics API: summary report for the channel.
	yaQ := url.Values{}
	yaQ.Set("ids", "channel==MINE")
	yaQ.Set("startDate", startDate)
	yaQ.Set("endDate", endDate)
	yaQ.Set("metrics", "views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost")
	reportURL := "https://youtubeanalytics.googleapis.com/v2/reports?" + yaQ.Encode()
	report, err := u.doJSON(ctx, http.MethodGet, reportURL, nil, map[string]string{"Authorization": "Bearer " + accessToken})
	if err != nil {
		return nil, err
	}

	return map[string]any{
		"startDate": startDate,
		"endDate":   endDate,
		"channels":  channels,
		"report":    report,
	}, nil
}

func (u *toolsUsecase) WhatsAppSend(ctx context.Context, to, message string) (any, error) {
	if strings.TrimSpace(to) == "" {
		return nil, apperror.Validation("to is required")
	}
	if strings.TrimSpace(message) == "" {
		return nil, apperror.Validation("message is required")
	}

	if strings.TrimSpace(u.whatsAppBotURL) == "" {
		return nil, apperror.Validation("WHATSAPP_BOT_URL is not configured")
	}

	endpoint := u.whatsAppBotURL + "/send"
	payload := map[string]any{
		"to":      to,
		"message": message,
	}

	return u.doJSON(ctx, http.MethodPost, endpoint, payload, nil)
}

func (u *toolsUsecase) TelegramSend(ctx context.Context, chatID, message string) (any, error) {
	if strings.TrimSpace(chatID) == "" {
		return nil, apperror.Validation("chat_id is required")
	}
	if strings.TrimSpace(message) == "" {
		return nil, apperror.Validation("message is required")
	}

	integ, err := u.integrations.Get(ctx)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(integ.TelegramBotToken) == "" {
		return nil, apperror.Validation("Telegram is not configured")
	}

	endpoint := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", integ.TelegramBotToken)
	payload := map[string]any{
		"chat_id": chatID,
		"text":    message,
	}
	return u.doJSON(ctx, http.MethodPost, endpoint, payload, nil)
}

func (u *toolsUsecase) TelegramUpdates(ctx context.Context, offset int, limit int, timeoutSeconds int) (any, error) {
	integ, err := u.integrations.Get(ctx)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(integ.TelegramBotToken) == "" {
		return nil, apperror.Validation("Telegram is not configured")
	}

	q := url.Values{}
	if offset > 0 {
		q.Set("offset", strconv.Itoa(offset))
	}
	if limit > 0 {
		if limit > 100 {
			limit = 100
		}
		q.Set("limit", strconv.Itoa(limit))
	}
	if timeoutSeconds > 0 {
		if timeoutSeconds > 50 {
			timeoutSeconds = 50
		}
		q.Set("timeout", strconv.Itoa(timeoutSeconds))
	}

	endpoint := fmt.Sprintf("https://api.telegram.org/bot%s/getUpdates?%s", integ.TelegramBotToken, q.Encode())
	return u.doJSON(ctx, http.MethodGet, endpoint, nil, nil)
}

func (u *toolsUsecase) DiscordWebhookSend(ctx context.Context, content string, username string) (any, error) {
	if strings.TrimSpace(content) == "" {
		return nil, apperror.Validation("content is required")
	}

	integ, err := u.integrations.Get(ctx)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(integ.DiscordWebhookURL) == "" {
		return nil, apperror.Validation("Discord webhook is not configured")
	}

	payload := map[string]any{
		"content": content,
	}
	if strings.TrimSpace(username) != "" {
		payload["username"] = username
	}

	return u.doJSON(ctx, http.MethodPost, integ.DiscordWebhookURL, payload, nil)
}
