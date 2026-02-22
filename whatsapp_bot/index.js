const fs = require("fs");
const path = require("path");

const express = require("express");
const QRCode = require("qrcode");
const pino = require("pino");
const { Boom } = require("@hapi/boom");

const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");

const PORT = parseInt(process.env.WHATSAPP_BOT_PORT || "3100", 10);
const HOST = process.env.WHATSAPP_BOT_HOST || "0.0.0.0";
const AUTH_DIR =
  process.env.WHATSAPP_BOT_AUTH_DIR || path.join(__dirname, "auth");
const DEFAULT_COUNTRY_CODE = String(
  process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "62",
).replace(/[^0-9]/g, "");
const BACKEND_URL = String(process.env.WHATSAPP_BACKEND_URL || "").replace(
  /\/$/,
  "",
);
const BACKEND_API_KEY = String(process.env.WHATSAPP_BACKEND_API_KEY || "");

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

let sock = null;
let latestQR = null;
let latestQRAt = null;
let connected = false;
let connectionState = "unknown";
let me = null;
let warnedMissingBackendConfig = false;

function extractTextMessage(msg) {
  if (!msg) return "";
  const m = msg.message || {};
  if (typeof m.conversation === "string") return m.conversation;
  if (typeof m.extendedTextMessage?.text === "string") {
    return m.extendedTextMessage.text;
  }
  if (typeof m.imageMessage?.caption === "string")
    return m.imageMessage.caption;
  if (typeof m.videoMessage?.caption === "string")
    return m.videoMessage.caption;
  return "";
}

async function postInboundToBackend(payload) {
  if (!BACKEND_URL || !BACKEND_API_KEY) {
    if (!warnedMissingBackendConfig) {
      warnedMissingBackendConfig = true;
      logger.warn(
        {
          has_backend_url: !!BACKEND_URL,
          has_backend_api_key: !!BACKEND_API_KEY,
        },
        "WHATSAPP_BACKEND_URL / WHATSAPP_BACKEND_API_KEY not set; inbound messages will not show in the dashboard",
      );
    }
    return;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(
      `${BACKEND_URL}/api/v1/internal/tools/whatsapp/inbound`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": BACKEND_API_KEY,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      logger.warn(
        { status: resp.status, body: txt },
        "backend inbound rejected",
      );
    }
  } catch (err) {
    logger.warn({ err }, "failed posting inbound to backend");
  }
}

function ensureAuthDir() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

function toJid(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (raw.includes("@s.whatsapp.net") || raw.includes("@g.us")) return raw;

  // Accept formats like +62812..., 0812..., 62812...
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";

  let normalized = digits;
  // Convert international prefix 00 ->
  if (normalized.startsWith("00")) {
    normalized = normalized.slice(2);
  }
  // Common local format: starts with 0 (e.g. 0812...) -> use default country code.
  if (normalized.startsWith("0") && DEFAULT_COUNTRY_CODE) {
    normalized = `${DEFAULT_COUNTRY_CODE}${normalized.slice(1)}`;
  }

  return jidNormalizedUser(`${normalized}@s.whatsapp.net`);
}

async function startSocket() {
  ensureAuthDir();

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: logger.child({ module: "baileys" }),
    generateHighQualityLinkPreview: true,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (typeof connection === "string") {
      connectionState = connection;
    }

    if (typeof qr === "string" && qr.trim() !== "") {
      latestQR = qr;
      latestQRAt = new Date().toISOString();
      logger.info({ at: latestQRAt }, "QR updated - scan with WhatsApp");
    }

    if (connection === "open") {
      connected = true;
      me = sock.user || null;
      latestQR = null;
      latestQRAt = null;
      logger.info({ me }, "WhatsApp connected");
    }

    if (connection === "close") {
      connected = false;
      me = null;

      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const reason = statusCode || lastDisconnect?.error?.message;
      logger.warn({ reason }, "WhatsApp connection closed");

      if (statusCode !== DisconnectReason.loggedOut) {
        // Attempt to reconnect.
        try {
          await startSocket();
        } catch (err) {
          logger.error({ err }, "Failed to restart WhatsApp socket");
        }
      } else {
        logger.info("Logged out - auth cleared, waiting for new QR");
      }
    }
  });

  sock.ev.on("messages.upsert", (m) => {
    // Minimal: just log inbound messages for now.
    // You can extend this to forward inbound messages to your Go backend.
    if (!m || !m.messages || m.type !== "notify") return;
    const msg = m.messages[0];
    if (!msg || msg.key?.fromMe) return;
    const text = extractTextMessage(msg);
    logger.info(
      {
        from: msg.key?.remoteJid,
        id: msg.key?.id,
        message: Object.keys(msg.message || {}),
      },
      "Inbound message",
    );

    // Best-effort forward to backend for Activities log.
    if (text.trim() !== "") {
      void postInboundToBackend({
        from: msg.key?.remoteJid || "",
        message: text,
        message_id: msg.key?.id || "",
        timestamp:
          typeof msg.messageTimestamp === "number" ? msg.messageTimestamp : 0,
      });
    }
  });
}

async function logoutAndClearAuth() {
  try {
    if (sock) {
      await sock.logout();
    }
  } catch (err) {
    logger.warn({ err }, "logout failed");
  }

  // Clear auth on disk.
  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  } catch (err) {
    logger.warn({ err }, "failed clearing auth dir");
  }

  sock = null;
  latestQR = null;
  latestQRAt = null;
  connected = false;
  me = null;

  await startSocket();
}

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/status", (req, res) => {
  res.json({
    connected,
    connection_state: connectionState,
    me,
    qr_available: !!latestQR,
    qr_updated_at: latestQRAt,
  });
});

app.get("/qr", (req, res) => {
  if (!latestQR) {
    res.status(204).end();
    return;
  }
  res.json({ qr: latestQR, updated_at: latestQRAt });
});

app.get("/qr.png", async (req, res) => {
  if (!latestQR) {
    res.status(204).end();
    return;
  }
  try {
    const png = await QRCode.toBuffer(latestQR, {
      type: "png",
      errorCorrectionLevel: "M",
      margin: 1,
      scale: 6,
    });
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.send(png);
  } catch (err) {
    logger.error({ err }, "failed generating QR png");
    res.status(500).json({ error: "failed to generate qr" });
  }
});

app.post("/send", async (req, res) => {
  const to = toJid(req.body?.to);
  const message = String(req.body?.message || "").trim();

  if (!to) {
    res.status(400).json({ error: "to is required" });
    return;
  }
  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }
  if (!sock || !connected) {
    res.status(400).json({ error: "whatsapp not connected" });
    return;
  }

  try {
    // Fail fast for invalid/nonexistent numbers instead of timing out in send.
    if (!to.endsWith("@g.us")) {
      const exists = await sock.onWhatsApp(to);
      if (!Array.isArray(exists) || exists.length === 0 || !exists[0]?.exists) {
        res.status(400).json({ error: "recipient is not on WhatsApp", to });
        return;
      }
    }

    const result = await sock.sendMessage(to, { text: message });
    res.json({ ok: true, id: result?.key?.id });
  } catch (err) {
    logger.error({ err, to }, "send failed");
    const msg = err instanceof Error ? err.message : "send failed";
    res.status(500).json({ error: "send failed", message: msg });
  }
});

app.post("/logout", async (req, res) => {
  await logoutAndClearAuth();
  res.json({ ok: true });
});

app.listen(PORT, HOST, async () => {
  logger.info({ host: HOST, port: PORT }, "WhatsApp bot listening");
  try {
    await startSocket();
  } catch (err) {
    logger.error({ err }, "failed to start WhatsApp socket");
  }
});
