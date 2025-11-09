// 🌍 Load environment variables
require("dotenv").config();

const express = require("express");
const http = require("http");
const axios = require("axios");
const cors = require("cors");
const { Server } = require("socket.io");
const geoip = require("geoip-lite");
const mongoose = require("mongoose");

const { expressjwt: jwt } = require("express-jwt");
const jwksRsa = require("jwks-rsa");

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    jwksUri: `https://YOUR_AUTH0_DOMAIN/.well-known/jwks.json`,
    cache: true,
    rateLimit: true
  }),
  audience: "YOUR_API_IDENTIFIER",
  issuer: `https://YOUR_AUTH0_DOMAIN/`,
  algorithms: ["RS256"]
});

const aggregateFeeds = require("./services/threatFeeds");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Attack = require("./models/Attack");

// --- Configuration ---
const MONGO_URI = process.env.MONGO_URI || "";
const ABUSEIPDB_KEY = process.env.ABUSEIPDB_KEY || "";
const PORT = process.env.PORT || 4000;

// --- Express Setup ---
const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(rateLimit({ windowMs: 60 * 1000, max: 60 }));

app.get("/", (req, res) => res.send("🚀 Cyber Attack Map backend is running!"));

app.get("/api/secure", checkJwt, (req, res) => {
  res.json({ message: "🔐 Secure data", user: req.auth });
});

app.get("/metrics", (req, res) => {
  res.set("Content-Type", "text/plain");
  res.send(`# HELP attack_count Total attacks processed\nattack_count ${lastSuccessfulData.length}`);
});

// --- MongoDB Connection ---
if (!MONGO_URI) {
  console.warn("⚠️ MONGO_URI not set in backend/.env — DB disabled (using fallback simulated data).");
} else {
  mongoose
    .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB connection error:", err.message));
}

// --- HTTP & Socket.IO Setup ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- Fetch Loop Configuration ---
let fetchIntervalMs = 60 * 1000; // default 60s
let backoffFactor = 1;
const MAX_BACKOFF_FACTOR = 16;
let lastSuccessfulData = [];
let lastFetchTs = 0;

// --- Helpers ---
function ipToLatLon(ipAddr) {
  try {
    const geo = geoip.lookup(ipAddr);
    if (geo?.ll) return { lat: geo.ll[0], lon: geo.ll[1] };
  } catch (_) {}
  return { lat: Math.random() * 180 - 90, lon: Math.random() * 360 - 180 };
}

async function fetchAbuseIpDb() {
  if (!ABUSEIPDB_KEY) throw new Error("AbuseIPDB key missing in backend/.env (ABUSEIPDB_KEY)");
  const url = "https://api.abuseipdb.com/api/v2/blacklist";
  const res = await axios.get(url, {
    headers: { Key: ABUSEIPDB_KEY, Accept: "application/json" },
    timeout: 15000,
  });
  return res.data.data || [];
}

function buildAttacks(rows) {
  return rows.slice(0, 20).map((r) => {
    const ip = r.ipAddress || r.ip || "0.0.0.0";
    const { lat, lon } = ipToLatLon(ip);
    return {
      id: `${ip}-${Date.now()}`,
      ip,
      country: r.countryCode || r.country || "??",
      lat,
      lon,
      confidence: r.confidence || 0,
      source: "abuseipdb",
      timestamp: new Date(),
    };
  });
}

function simulatedAttacks(count = 10) {
  return Array.from({ length: count }, (_, i) => ({
    id: `sim-${Date.now()}-${i}`,
    ip: "0.0.0.0",
    country: "SIM",
    lat: Math.random() * 180 - 90,
    lon: Math.random() * 360 - 180,
    confidence: 0,
    source: "simulated",
    timestamp: new Date(),
  }));
}

// --- Main Fetch + Emit Logic ---
async function fetchAndEmit() {
  try {
    console.log(`🔁 Fetching AbuseIPDB (interval ${fetchIntervalMs / 1000}s, backoff x${backoffFactor})`);
    const rows = await fetchAbuseIpDb();
    const attacks = buildAttacks(rows);

    // Cache & reset backoff
    lastSuccessfulData = attacks;
    lastFetchTs = Date.now();
    backoffFactor = 1;
    fetchIntervalMs = 60 * 1000;

    // Save to MongoDB (non-blocking)
    if (mongoose.connection.readyState === 1) {
      Attack.insertMany(
        attacks.map((a) => ({
          ip: a.ip,
          country: a.country,
          lat: a.lat,
          lon: a.lon,
          confidence: a.confidence,
          source: a.source,
          timestamp: a.timestamp || new Date(),
        }))
      )
        .then(() => console.log("💾 Saved attacks to MongoDB"))
        .catch((err) => console.warn("⚠️ DB save error:", err.message));
    }

    io.emit("attackData", attacks);
    console.log(`✅ Emitted ${attacks.length} attacks (live).`);
  } catch (err) {
    const status = err.response?.status;
    console.error("❌ API error:", status || "unknown", err.message);

    if (status === 429) {
      backoffFactor = Math.min(MAX_BACKOFF_FACTOR, backoffFactor * 2);
      fetchIntervalMs = 60 * 1000 * backoffFactor;
      console.warn(`⚠️ Rate limited (429). Backoff x${backoffFactor} → ${fetchIntervalMs / 1000}s.`);
      io.emit("attackData", lastSuccessfulData.length ? lastSuccessfulData : simulatedAttacks(10));
    } else if (status === 401) {
      console.error("🔑 Invalid AbuseIPDB key — check ABUSEIPDB_KEY in backend/.env");
      io.emit("attackData", simulatedAttacks(10));
    } else {
      backoffFactor = Math.min(MAX_BACKOFF_FACTOR, backoffFactor + 1);
      fetchIntervalMs = 60 * 1000 * backoffFactor;
      io.emit("attackData", lastSuccessfulData.length ? lastSuccessfulData : simulatedAttacks(10));
    }
  }
}

// --- Fetch Scheduler ---
let fetchTimeout = null;
function scheduleLoop() {
  if (fetchTimeout) clearTimeout(fetchTimeout);
  fetchTimeout = setTimeout(async () => {
    await fetchAndEmit();
    scheduleLoop();
  }, fetchIntervalMs);
}

// --- Socket.IO Connections ---
io.on("connection", async (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  if (mongoose.connection.readyState === 1) {
    try {
      const last = await Attack.find({}).sort({ timestamp: -1 }).limit(50).lean().exec();
      socket.emit("attackData", last.reverse());
    } catch (err) {
      console.warn("⚠️ DB read error:", err.message);
      socket.emit("attackData", simulatedAttacks(10));
    }
  } else {
    socket.emit("attackData", simulatedAttacks(10));
  }

  socket.on("disconnect", () => console.log(`🔌 Client disconnected: ${socket.id}`));
});

// --- Start Server inside async wrapper ---
async function startServer() {
  try {
    const rows = await aggregateFeeds();
    console.log("✅ Initial threat feeds loaded:", rows.length);

    await fetchAndEmit();
    scheduleLoop();

    server.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));
  } catch (err) {
    console.error("❌ Error starting server:", err.message);
  }
}

startServer();
