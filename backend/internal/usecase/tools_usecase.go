package usecase

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

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
	integrations domain.OwnerIntegrationsRepository
	clientID     string
	clientSecret string
	redirectURL  string
	whatsAppBotURL string
	httpClient   *http.Client
}

func NewToolsUsecase(
	integrations domain.OwnerIntegrationsRepository,
	clientID, clientSecret, redirectURL, whatsAppBotURL string,
) domain.ToolsUsecase {
	return &toolsUsecase{
		integrations: integrations,
		clientID:     clientID,
		clientSecret: clientSecret,
		redirectURL:  redirectURL,
		whatsAppBotURL: strings.TrimRight(whatsAppBotURL, "/"),
		httpClient:   &http.Client{Timeout: 30 * time.Second},
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
		return nil, apperror.ExternalError(fmt.Errorf("status %d: %s", resp.StatusCode, string(b)), "external api error")
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
		"query": query,
		"count": len(results),
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
		"items": []map[string]any{{"id": "primary"}},
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
