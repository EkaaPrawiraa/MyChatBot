# axis-whatsapp-bot

Local WhatsApp Web-style bot (scan QR from your phone) used by the Go backend.

## Run

```bash
cd whatsapp_bot
npm install
npm run dev
```

Default:

- Bot server: `http://localhost:3100`
- Auth state stored in `whatsapp_bot/auth/`

Optional (for logging inbound messages to the dashboard Activities):

- `WHATSAPP_BACKEND_URL=http://localhost:8080`
- `WHATSAPP_BACKEND_API_KEY=...` (same value as backend `API_KEY`)

## Endpoints

- `GET /status` → connection status
- `GET /qr.png` → QR code PNG (204 if not available)
- `POST /send` `{ "to": "+62812...", "message": "hi" }`
- `POST /logout` → log out + clear auth state (forces new QR)

## Notes

This uses a WhatsApp Web session. Make sure WhatsApp on your phone is logged in.

Phone number formats for POST /send:

- JID: 62812xxxx@s.whatsapp.net (or 123456@g.us for groups)
- Phone-like: +62812..., 62812..., or local 0812...

Local numbers starting with 0 are normalized using WHATSAPP_DEFAULT_COUNTRY_CODE (default: 62).
