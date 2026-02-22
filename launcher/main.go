package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

type launcherState struct {
	mu         sync.Mutex
	lastOutput string
	runningCmd bool
	cmdName    string
	cmdSince   time.Time
}

var state launcherState

type configPayload struct {
	APIKey            string `json:"API_KEY"`
	OpenAIAPIKey      string `json:"OPENAI_API_KEY"`
	OpenAIModel       string `json:"OPENAI_MODEL"`
	TavilyAPIKey      string `json:"TAVILY_API_KEY"`
	DashboardURL      string `json:"DASHBOARD_URL"`
	GoogleClientID    string `json:"GOOGLE_CLIENT_ID"`
	GoogleClientSecret string `json:"GOOGLE_CLIENT_SECRET"`
	GoogleRedirectURL string `json:"GOOGLE_REDIRECT_URL"`
	XClientID         string `json:"X_CLIENT_ID"`
	XClientSecret     string `json:"X_CLIENT_SECRET"`
	XRedirectURI      string `json:"X_REDIRECT_URI"`
	WhatsAppDefaultCountryCode string `json:"WHATSAPP_DEFAULT_COUNTRY_CODE"`
	WhatsAppVerifyToken string `json:"WHATSAPP_VERIFY_TOKEN"`
	WhatsAppAPIToken    string `json:"WHATSAPP_API_TOKEN"`
	NextPublicBackendURL string `json:"NEXT_PUBLIC_BACKEND_URL"`
	NextPublicAPIURL     string `json:"NEXT_PUBLIC_API_URL"`
	NextPublicAPIKey     string `json:"NEXT_PUBLIC_API_KEY"`
}

type statusResponse struct {
	ProjectDir string `json:"projectDir"`
	DockerOK   bool   `json:"dockerOk"`
	ComposeOK  bool   `json:"composeOk"`
	EnvOK      bool   `json:"envOk"`
	Services   []serviceStatus `json:"services"`
	Ports      map[string]int  `json:"ports"`
	LastOutput string `json:"lastOutput"`
	Busy       bool   `json:"busy"`
	BusyCmd    string `json:"busyCmd"`
	BusySinceMs int64 `json:"busySinceMs"`
}

type serviceStatus struct {
	Name   string `json:"name"`
	URL    string `json:"url"`
	Health string `json:"health"` // ok|down|unknown
}

func main() {
	projectDir, err := resolveProjectDir()
	if err != nil {
		fmt.Fprintf(os.Stderr, "launcher: %v\n", err)
		os.Exit(1)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")		
		io.WriteString(w, indexHTML)
	})
	mux.HandleFunc("/api/status", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, buildStatus(projectDir))
	})
	mux.HandleFunc("/api/config", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var cfg configPayload
		if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if strings.TrimSpace(cfg.APIKey) == "" {
			cfg.APIKey = "change-me-to-a-strong-secret"
		}
		if err := writeDotEnv(projectDir, cfg); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]any{"ok": true})
	})
	mux.HandleFunc("/api/start", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		go runCompose(projectDir, []string{"up", "-d", "--build"})
		writeJSON(w, map[string]any{"ok": true})
	})
	mux.HandleFunc("/api/stop", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		go runCompose(projectDir, []string{"down"})
		writeJSON(w, map[string]any{"ok": true})
	})

	addr := "127.0.0.1:4187"
	srv := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	fmt.Printf("Axis Assistant Launcher running at http://%s\n", addr)
	_ = openBrowser("http://" + addr)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		fmt.Fprintf(os.Stderr, "server error: %v\n", err)
		os.Exit(1)
	}
}

func resolveProjectDir() (string, error) {
	// Prefer explicit arg: --project=/path
	for _, arg := range os.Args[1:] {
		if strings.HasPrefix(arg, "--project=") {
			p := strings.TrimPrefix(arg, "--project=")
			return ensureProjectDir(p)
		}
	}

	if env := strings.TrimSpace(os.Getenv("AXIS_PROJECT_DIR")); env != "" {
		return ensureProjectDir(env)
	}

	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	// If run from repo root, great.
	if _, err := os.Stat(filepath.Join(wd, "docker-compose.yml")); err == nil {
		return wd, nil
	}
	// If run from launcher folder, go one up.
	parent := filepath.Dir(wd)
	if _, err := os.Stat(filepath.Join(parent, "docker-compose.yml")); err == nil {
		return parent, nil
	}
	return "", fmt.Errorf("could not find docker-compose.yml; run from project root or pass --project=...")
}

func ensureProjectDir(p string) (string, error) {
	abs, err := filepath.Abs(p)
	if err != nil {
		return "", err
	}
	if _, err := os.Stat(filepath.Join(abs, "docker-compose.yml")); err != nil {
		return "", fmt.Errorf("invalid project dir (missing docker-compose.yml): %s", abs)
	}
	return abs, nil
}

func buildStatus(projectDir string) statusResponse {
	dockerOK := commandOK("docker", "--version")
	composeOK := commandOK("docker", "compose", "version")
	envOK := fileExists(filepath.Join(projectDir, ".env"))

	ports := map[string]int{
		"frontend":    3000,
		"backend":     8080,
		"agent":       8000,
		"whatsapp_bot": 3100,
		"postgres":    5432,
		"redis":       6379,
	}

	services := []serviceStatus{
		{Name: "Frontend", URL: "http://localhost:3000", Health: probeHTTP("http://localhost:3000")},
		{Name: "Backend", URL: "http://localhost:8080/health", Health: probeHTTP("http://localhost:8080/health")},
		{Name: "Agent", URL: "http://localhost:8000/health", Health: probeHTTP("http://localhost:8000/health")},
		{Name: "WhatsApp Bot", URL: "http://localhost:3100/status", Health: probeHTTP("http://localhost:3100/status")},
		{Name: "Postgres", URL: "localhost:5432", Health: "unknown"},
		{Name: "Redis", URL: "localhost:6379", Health: "unknown"},
	}

	state.mu.Lock()
	out := state.lastOutput
	busy := state.runningCmd
	busyCmd := state.cmdName
	busySince := state.cmdSince
	state.mu.Unlock()

	var busySinceMs int64
	if busy && !busySince.IsZero() {
		busySinceMs = time.Since(busySince).Milliseconds()
	}

	return statusResponse{
		ProjectDir: projectDir,
		DockerOK:   dockerOK,
		ComposeOK:  composeOK,
		EnvOK:      envOK,
		Services:   services,
		Ports:      ports,
		LastOutput: out,
		Busy:       busy,
		BusyCmd:    busyCmd,
		BusySinceMs: busySinceMs,
	}
}

func probeHTTP(url string) string {
	client := &http.Client{Timeout: 1500 * time.Millisecond}
	resp, err := client.Get(url)
	if err != nil {
		return "down"
	}
	_ = resp.Body.Close()
	if resp.StatusCode >= 200 && resp.StatusCode < 500 {
		return "ok"
	}
	return "down"
}

func commandOK(name string, args ...string) bool {
	cmd := exec.Command(name, args...)
	cmd.Stdout = io.Discard
	cmd.Stderr = io.Discard
	return cmd.Run() == nil
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func runCompose(projectDir string, composeArgs []string) {
	state.mu.Lock()
	if state.runningCmd {
		state.mu.Unlock()
		return
	}
	state.runningCmd = true
	state.lastOutput = ""
	state.cmdName = "docker compose " + strings.Join(composeArgs, " ")
	state.cmdSince = time.Now()
	state.mu.Unlock()

	defer func() {
		state.mu.Lock()
		state.runningCmd = false
		state.mu.Unlock()
	}()

	cmd := exec.Command("docker", append([]string{"compose"}, composeArgs...)...)
	cmd.Dir = projectDir

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		appendStateOutput("launcher: failed to open stdout pipe: " + err.Error() + "\n")
		_ = cmd.Run()
		return
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		appendStateOutput("launcher: failed to open stderr pipe: " + err.Error() + "\n")
		_ = cmd.Run()
		return
	}

	appendStateOutput("$ " + state.cmdName + "\n")
	if err := cmd.Start(); err != nil {
		appendStateOutput("launcher: failed to start command: " + err.Error() + "\n")
		return
	}

	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		streamLines(stdout)
	}()
	go func() {
		defer wg.Done()
		streamLines(stderr)
	}()

	err = cmd.Wait()
	wg.Wait()
	if err != nil {
		appendStateOutput("\nlauncher: command failed: " + err.Error() + "\n")
	}
}

func streamLines(r io.Reader) {
	s := bufio.NewScanner(r)
	// Avoid token-too-long for very long docker output lines.
	buf := make([]byte, 0, 64*1024)
	s.Buffer(buf, 1024*1024)
	for s.Scan() {
		appendStateOutput(s.Text() + "\n")
	}
	if err := s.Err(); err != nil {
		appendStateOutput("launcher: stream error: " + err.Error() + "\n")
	}
}

func appendStateOutput(s string) {
	const max = 120_000
	state.mu.Lock()
	defer state.mu.Unlock()
	state.lastOutput += s
	if len(state.lastOutput) > max {
		state.lastOutput = state.lastOutput[len(state.lastOutput)-max:]
	}
}

func writeDotEnv(projectDir string, cfg configPayload) error {
	path := filepath.Join(projectDir, ".env")
	lines := []string{
		"# Generated by Axis Assistant Launcher",
		"API_KEY=" + shellEscape(cfg.APIKey),
		"OPENAI_API_KEY=" + shellEscape(cfg.OpenAIAPIKey),
	}
	if strings.TrimSpace(cfg.OpenAIModel) != "" {
		lines = append(lines, "OPENAI_MODEL="+shellEscape(cfg.OpenAIModel))
	}
	if strings.TrimSpace(cfg.TavilyAPIKey) != "" {
		lines = append(lines, "TAVILY_API_KEY="+shellEscape(cfg.TavilyAPIKey))
	}
	if strings.TrimSpace(cfg.DashboardURL) != "" {
		lines = append(lines, "DASHBOARD_URL="+shellEscape(cfg.DashboardURL))
	}
	if strings.TrimSpace(cfg.GoogleClientID) != "" {
		lines = append(lines, "GOOGLE_CLIENT_ID="+shellEscape(cfg.GoogleClientID))
	}
	if strings.TrimSpace(cfg.GoogleClientSecret) != "" {
		lines = append(lines, "GOOGLE_CLIENT_SECRET="+shellEscape(cfg.GoogleClientSecret))
	}
	if strings.TrimSpace(cfg.GoogleRedirectURL) != "" {
		lines = append(lines, "GOOGLE_REDIRECT_URL="+shellEscape(cfg.GoogleRedirectURL))
	}
	if strings.TrimSpace(cfg.XClientID) != "" {
		lines = append(lines, "X_CLIENT_ID="+shellEscape(cfg.XClientID))
	}
	if strings.TrimSpace(cfg.XClientSecret) != "" {
		lines = append(lines, "X_CLIENT_SECRET="+shellEscape(cfg.XClientSecret))
	}
	if strings.TrimSpace(cfg.XRedirectURI) != "" {
		lines = append(lines, "X_REDIRECT_URI="+shellEscape(cfg.XRedirectURI))
	}
	if strings.TrimSpace(cfg.WhatsAppDefaultCountryCode) != "" {
		lines = append(lines, "WHATSAPP_DEFAULT_COUNTRY_CODE="+shellEscape(cfg.WhatsAppDefaultCountryCode))
	}
	if strings.TrimSpace(cfg.WhatsAppVerifyToken) != "" {
		lines = append(lines, "WHATSAPP_VERIFY_TOKEN="+shellEscape(cfg.WhatsAppVerifyToken))
	}
	if strings.TrimSpace(cfg.WhatsAppAPIToken) != "" {
		lines = append(lines, "WHATSAPP_API_TOKEN="+shellEscape(cfg.WhatsAppAPIToken))
	}
	if strings.TrimSpace(cfg.NextPublicBackendURL) != "" {
		lines = append(lines, "NEXT_PUBLIC_BACKEND_URL="+shellEscape(cfg.NextPublicBackendURL))
	}
	if strings.TrimSpace(cfg.NextPublicAPIURL) != "" {
		lines = append(lines, "NEXT_PUBLIC_API_URL="+shellEscape(cfg.NextPublicAPIURL))
	}
	if strings.TrimSpace(cfg.NextPublicAPIKey) != "" {
		lines = append(lines, "NEXT_PUBLIC_API_KEY="+shellEscape(cfg.NextPublicAPIKey))
	}
	lines = append(lines, "")
	return os.WriteFile(path, []byte(strings.Join(lines, "\n")), 0600)
}

func shellEscape(v string) string {
	// .env format: allow raw, but quote if it has spaces or special chars.
	s := strings.TrimSpace(v)
	// Newlines in .env values can corrupt the file and break docker compose parsing.
	s = strings.ReplaceAll(s, "\r", "")
	s = strings.ReplaceAll(s, "\n", "")
	if s == "" {
		return ""
	}
	if strings.ContainsAny(s, " \t\n\r\"'\\") {
		s = strings.ReplaceAll(s, "\\", "\\\\")
		s = strings.ReplaceAll(s, "\"", "\\\"")
		return "\"" + s + "\""
	}
	return s
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(v)
}

func openBrowser(url string) error {
	switch runtime.GOOS {
	case "darwin":
		return exec.Command("open", url).Start()
	case "windows":
		return exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	default:
		return exec.Command("xdg-open", url).Start()
	}
}

const indexHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Axis Assistant Launcher</title>
  <style>
    :root { color-scheme: dark; }
    body { font-family: ui-sans-serif, system-ui; margin: 0; background: #0b0f19; color: #e6e8ef; }
    .wrap { max-width: 960px; margin: 0 auto; padding: 24px; }
    .card { border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.04); border-radius: 12px; padding: 16px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    label { display:block; font-size: 12px; opacity: 0.85; margin-bottom: 6px; }
    input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: rgba(0,0,0,0.25); color: #e6e8ef; }
    button { padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.10); color: #e6e8ef; cursor: pointer; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .top { display:flex; align-items: center; justify-content: space-between; gap: 12px; }
    .muted { opacity: 0.8; font-size: 12px; }
    .ok { color: #7ee787; }
    .bad { color: #ff7b72; }
    pre { white-space: pre-wrap; word-break: break-word; background: rgba(0,0,0,0.30); padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.10); }
    .services { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    a { color: #a5d6ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    @media (max-width: 800px) { .row, .services { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div>
        <h2 style="margin:0">Axis Assistant Launcher</h2>
        <div class="muted">First-run setup + start/stop all services</div>
      </div>
      <div style="display:flex; gap:8px">
        <button id="startBtn">Start</button>
        <button id="stopBtn">Stop</button>
      </div>
    </div>

    <div style="height: 14px"></div>

    <div class="card">
      <div class="muted" id="statusLine">Loading…</div>
      <div style="height: 10px"></div>
      <div class="services" id="services"></div>
    </div>

    <div style="height: 14px"></div>

    <div class="card">
      <h3 style="margin-top:0">Configuration (.env for Docker Compose)</h3>
      <div class="row">
        <div>
          <label>API_KEY (internal auth)</label>
          <input id="API_KEY" placeholder="change-me-to-a-strong-secret" />
        </div>
        <div>
          <label>OPENAI_API_KEY (required for agent)</label>
          <input id="OPENAI_API_KEY" placeholder="sk-..." />
        </div>
        <div>
          <label>OPENAI_MODEL</label>
          <input id="OPENAI_MODEL" placeholder="gpt-4o-mini" />
        </div>
		<div>
		  <label>TAVILY_API_KEY (optional, enables web search)</label>
		  <input id="TAVILY_API_KEY" placeholder="tvly-..." />
		</div>
		<div>
		  <label>DASHBOARD_URL (optional redirect after OAuth)</label>
		  <input id="DASHBOARD_URL" placeholder="http://localhost:3000" />
		</div>
        <div>
          <label>WHATSAPP_DEFAULT_COUNTRY_CODE</label>
          <input id="WHATSAPP_DEFAULT_COUNTRY_CODE" placeholder="62" />
        </div>
		<div>
		  <label>WHATSAPP_VERIFY_TOKEN (optional)</label>
		  <input id="WHATSAPP_VERIFY_TOKEN" placeholder="" />
		</div>
		<div>
		  <label>WHATSAPP_API_TOKEN (optional)</label>
		  <input id="WHATSAPP_API_TOKEN" placeholder="" />
		</div>
        <div>
          <label>GOOGLE_CLIENT_ID</label>
          <input id="GOOGLE_CLIENT_ID" placeholder="" />
        </div>
        <div>
          <label>GOOGLE_CLIENT_SECRET</label>
          <input id="GOOGLE_CLIENT_SECRET" placeholder="" />
        </div>
        <div>
          <label>GOOGLE_REDIRECT_URL</label>
          <input id="GOOGLE_REDIRECT_URL" placeholder="https://.../api/v1/integrations/google/callback" />
        </div>
        <div>
          <label>X_CLIENT_ID</label>
          <input id="X_CLIENT_ID" placeholder="" />
        </div>
        <div>
          <label>X_CLIENT_SECRET</label>
          <input id="X_CLIENT_SECRET" placeholder="" />
        </div>
        <div>
          <label>X_REDIRECT_URI</label>
          <input id="X_REDIRECT_URI" placeholder="https://.../api/v1/integrations/x/callback" />
        </div>
		<div>
		  <label>NEXT_PUBLIC_BACKEND_URL (optional)</label>
		  <input id="NEXT_PUBLIC_BACKEND_URL" placeholder="" />
		</div>
		<div>
		  <label>NEXT_PUBLIC_API_URL (optional)</label>
		  <input id="NEXT_PUBLIC_API_URL" placeholder="" />
		</div>
		<div>
		  <label>NEXT_PUBLIC_API_KEY (optional)</label>
		  <input id="NEXT_PUBLIC_API_KEY" placeholder="" />
		</div>
      </div>
      <div style="height: 12px"></div>
      <button id="saveBtn">Save Config</button>
      <div class="muted" style="margin-top:8px">Tip: after first start, open <a href="http://localhost:3000" target="_blank" rel="noreferrer">http://localhost:3000</a> and connect integrations in Settings.</div>
    </div>

    <div style="height: 14px"></div>

    <div class="card">
      <h3 style="margin-top:0">Last Output</h3>
      <pre id="output">(none)</pre>
    </div>
  </div>

<script>
  async function post(url, body) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : '{}',
    });
    if (!resp.ok) throw new Error(await resp.text());
  }

  function healthBadge(h) {
    if (h === 'ok') return '<span class="ok">● ok</span>';
    if (h === 'down') return '<span class="bad">● down</span>';
    return '<span class="muted">● unknown</span>';
  }

  async function refresh() {
    const resp = await fetch('/api/status');
    const s = await resp.json();

    const docker = s.dockerOk ? '<span class="ok">Docker OK</span>' : '<span class="bad">Docker missing</span>';
    const compose = s.composeOk ? '<span class="ok">Compose OK</span>' : '<span class="bad">Compose missing</span>';
    const env = s.envOk ? '<span class="ok">.env OK</span>' : '<span class="bad">.env missing</span>';

	let busy = '';
	if (s.busy) {
		const secs = Math.floor((s.busySinceMs || 0) / 1000);
		const cmd = s.busyCmd ? (' — <span class="muted">' + s.busyCmd + '</span>') : '';
		busy = ' · <span class="muted">Running (' + secs + 's)</span>' + cmd;
	}

	document.getElementById('statusLine').innerHTML = 'Project: <b>' + s.projectDir + '</b> — ' + docker + ' · ' + compose + ' · ' + env + busy;

		if (s.busy && (!s.lastOutput || s.lastOutput.trim() === '')) {
			document.getElementById('output').textContent = '(running…)';
		} else {
			document.getElementById('output').textContent = s.lastOutput || '(none)';
		}

		const svc = s.services.map(x => {
			const link = x.url.startsWith('http')
				? '<a href="' + x.url + '" target="_blank" rel="noreferrer">' + x.url + '</a>'
				: x.url;
			return '<div class="card" style="padding:12px">'
				+ '<div style="display:flex; justify-content:space-between; gap:10px">'
				+ '<div>'
				+ '<div style="font-weight:600">' + x.name + '</div>'
				+ '<div class="muted">' + link + '</div>'
				+ '</div>'
				+ '<div>' + healthBadge(x.health) + '</div>'
				+ '</div>'
				+ '</div>';
		}).join('');
    document.getElementById('services').innerHTML = svc;

    document.getElementById('startBtn').disabled = s.busy || !s.dockerOk || !s.composeOk;
    document.getElementById('stopBtn').disabled = s.busy || !s.dockerOk || !s.composeOk;
    document.getElementById('saveBtn').disabled = s.busy;
  }

  document.getElementById('saveBtn').addEventListener('click', async () => {
		const ids = ['API_KEY','OPENAI_API_KEY','OPENAI_MODEL','TAVILY_API_KEY','DASHBOARD_URL','WHATSAPP_DEFAULT_COUNTRY_CODE','WHATSAPP_VERIFY_TOKEN','WHATSAPP_API_TOKEN','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REDIRECT_URL','X_CLIENT_ID','X_CLIENT_SECRET','X_REDIRECT_URI','NEXT_PUBLIC_BACKEND_URL','NEXT_PUBLIC_API_URL','NEXT_PUBLIC_API_KEY'];
    const body = {};
    for (const id of ids) body[id] = document.getElementById(id).value;
    await post('/api/config', body);
    await refresh();
    alert('Saved .env');
  });

  document.getElementById('startBtn').addEventListener('click', async () => {
    await post('/api/start');
    await refresh();
  });

  document.getElementById('stopBtn').addEventListener('click', async () => {
    await post('/api/stop');
    await refresh();
  });

  refresh();
  setInterval(refresh, 2000);
</script>
</body>
</html>`
