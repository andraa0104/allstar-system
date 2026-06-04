import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import express from "express";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { Boom } from "@hapi/boom";

const app = express();
const port = 8011;

// CORS Middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

let sock = null;
let connState = "disconnected";
let latestQr = null;

const sessionDir = path.join(process.cwd(), "baileys_auth_info");

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  sock = makeWASocket.default({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        latestQr = await QRCode.toDataURL(qr);
      } catch (err) {
        console.error("Failed to generate QR data URL:", err);
      }
    }

    if (connection === "close") {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut
        : true;

      console.log("connection closed due to ", lastDisconnect?.error, ", reconnecting ", shouldReconnect);
      
      connState = "disconnected";
      
      if (shouldReconnect) {
        connectToWhatsApp();
      } else {
        console.log("Logged out. Clearing session directory.");
        latestQr = null;
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (e) {
          console.error("Failed to clear session dir:", e);
        }
        // Restart connection to generate a new QR
        setTimeout(() => connectToWhatsApp(), 2000);
      }
    } else if (connection === "open") {
      console.log("opened connection");
      connState = "connected";
      latestQr = null;
    } else if (connection === "connecting") {
      connState = "connecting";
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

// REST API Endpoints
app.get("/status", (req, res) => {
  res.json({
    status: connState,
    qr: latestQr
  });
});

app.post("/send-message", async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: "Phone and message are required." });
  }

  if (connState !== "connected" || !sock) {
    return res.status(503).json({ error: "WhatsApp is not connected." });
  }

  try {
    // Format phone number to WhatsApp JID (e.g. 628123456789@s.whatsapp.net)
    let formattedPhone = phone.replace(/[^0-9]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "62" + formattedPhone.slice(1);
    }

    // Check if number exists on WhatsApp
    const check = await sock.onWhatsApp(formattedPhone);
    if (!check || check.length === 0 || !check[0].exists) {
      console.log(`Number ${formattedPhone} is not registered on WhatsApp. Ignoring message.`);
      return res.json({ success: true, ignored: true, reason: "not_on_whatsapp" });
    }

    const jid = check[0].jid;

    await sock.sendMessage(jid, { text: message });
    res.json({ success: true });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Failed to send message: " + err.message });
  }
});

// Start the express server
app.listen(port, () => {
  console.log(`WhatsApp Gateway Service listening at http://localhost:${port}`);
  connectToWhatsApp();
});
