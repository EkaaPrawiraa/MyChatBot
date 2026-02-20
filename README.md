# MyChatBot

Axis Assistant is a multi-service AI agent platform built with Go and Python that performs autonomous multi-step task execution with persistent memory, tool orchestration, and real-world API integrations.

Features:

Single User

    Gmail integration
    Google Calendar integration
    Persistent memory (pgvector)
    Multi-step tool execution
    Dashboard with activity logs
    Human approval before action
    Async reminder worker
    AI Planning Visualization
    Show graph execution from LangGraph in UI.
    Cross-Tool Workflow Automation
    Smart Email Mode (notify if job email)
    AI Safety & Guardrails
    Speech to Text

Memory:
Shortterm memory
Longterm Memory

Reminder Engine (Sends notification via WhatsApp/email)

Vue dashboard with:
Chat interface
Activity log timeline
Executed tool trace
Memory viewer
Upcoming tasks

Daily Briefing Mode
Every morning:
“Good morning X. Today you have 2 meetings, 3 pending tasks, and one email requiring response.”

User Profile Modeling (Structured + Semantic)
Not just vector memory — but structured profile:
Preferred meeting hours
Frequently contacted people
Work habits
Focus hours
Project contexts
Communication style

kill -9 $(lsof -t -i:8080)

## Connect Google (Gmail + Calendar + Contacts + Drive + YouTube)

This project uses Google OAuth in the Go backend.

1. Create OAuth credentials in Google Cloud Console

- Create/select a project
- Enable APIs:
  - Google Calendar API
  - Gmail API
  - Google People API (Contacts)
  - Google Drive API
  - YouTube Data API v3
  - YouTube Analytics API
- Configure OAuth consent screen (set to Testing + add yourself as a Test user if needed)
- Create credentials: **OAuth client ID** → **Web application**
- Add **Authorized redirect URI** (must match the backend route):
  - `http://localhost:8080/api/v1/integrations/google/callback`

2. Configure backend env

- In `backend/.env` set:
  - `GOOGLE_CLIENT_ID=...`
  - `GOOGLE_CLIENT_SECRET=...`
  - `GOOGLE_REDIRECT_URL=http://localhost:8080/api/v1/integrations/google/callback`
  - `DASHBOARD_URL=http://localhost:3005` (optional; where the browser should land after connect)

3. Connect from the dashboard

- Start backend + frontend
- Open `/settings` and click **Connect Google**
- After authorization, you should return to Settings and see Google as connected.

Note: If you previously connected Google before enabling the extra APIs/scopes, you may need to **Disconnect** and **Connect Google** again so the refresh token includes the new permissions.

## Connect WhatsApp (QR Scan)

This project uses a local WhatsApp-Web style bot (scan QR from your phone) — no Cloud API / business credentials.

1. Start the WhatsApp bot

```bash
cd whatsapp_bot
npm install
npm run dev
```

2. Configure backend env

- In `backend/.env` set:
  - `WHATSAPP_BOT_URL=http://localhost:3100`

3. Connect from the dashboard

- Open `/settings` → WhatsApp section
- Scan the QR using WhatsApp on your phone:
  - WhatsApp → Settings → Linked devices → Link a device
