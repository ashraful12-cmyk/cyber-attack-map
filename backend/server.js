// backend/server.js
// 🌍 Load environment variables
require("dotenv").config();

const express = require("express");
const http = require("http");
const axios = require("axios");
const cors = require("cors");
const { Server } = require("socket.io");
const geoip = require("geoip-lite");

// 🧩 MongoDB setup
const mongoose = require('mongoose');
const Attack = require('./models/Attack'); // ensure backend/models/Attack.js exists

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.warn('⚠️ MONGO_URI not set in backend/.env — DB disabled (using fallback simulated data).');
} else {
  mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err.message));
}

const ABUSEIPDB_KEY = process.env.ABUSEIPDB_KEY || "";
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.get("/", (req, res) => res.send("🚀 Cyber Attack Map backend is running!"));

// ✅ REST endpoint to fetch recent events
app.get('/api/attacks', async (req, res) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit || '50', 10));
    if (mongoose.connection.readyState !== 1) {
      return res.json({ source: 'simulated', data: [] });
    }
    const docs = await Attack.find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
      .exec();
    res.json({ source: 'db', data: docs });
  } catch (err) {
    console.error('API /api/attacks error:', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- Backoff + caching config ---
let fetchIntervalMs = 60 * 1000; // 60s default
let backoffFactor = 1;
const MAX_BACKOFF_FACTOR = 16;
let lastSuccessfulData = [];
let lastFetchTs = 0;

// helper to map ip -> lat/lon (fallback to random)
function ipToLatLon(ipAddr) {
  try {
    const geo = geoip.lookup(ipAddr);
    if (geo && geo.ll) return { lat: geo.ll[0], lon: geo.ll[1] };
  } catch (e) {}
  return { lat: Math.random() * 180 - 90, lon: Math.random() * 360 - 180 };
}

async function fetchAbuseIpDb() {
  if (!ABUSEIPDB_KEY)
    throw new Error("AbuseIPDB key missing in backend/.env (ABUSEIPDB_KEY)");
  const url = "https://api.abuseipdb.com/api/v2/blacklist";
  const res = await axios.get(url, {
    headers: {
      Key: ABUSEIPDB_KEY,
      Accept: "application/json",
    },
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
  return new Array(count).fill(0).map((_, i) => ({
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

async function fetchAndEmit() {
  try {
    console.log(
      `🔁 Fetching AbuseIPDB (interval ${fetchIntervalMs / 1000}s, backoff x${backoffFactor})`
    );
    const rows = await fetchAbuseIpDb();
    const attacks = buildAttacks(rows);

    lastSuccessfulData = attacks;
    lastFetchTs = Date.now();
    backoffFactor = 1;
    fetchIntervalMs = 60 * 1000;

    // 💾 Save attacks to MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      Attack.insertMany(attacks.map(a => ({
        ip: a.ip, country: a.country, lat: a.lat, lon: a.lon,
        confidence: a.confidence, source: a.source, timestamp: new Date()
      })))
      .then(() => console.log('💾 Saved attacks to MongoDB'))
      .catch(err => console.warn('DB save error:', err.message));
    }

    io.emit("attackData", attacks);
    console.log(`✅ Emitted ${attacks.length} attack rows (live).`);
  } catch (err) {
    const status = err.response?.status;
    console.error("API error:", status || "", err.message);

    if (status === 429) {
      backoffFactor = Math.min(MAX_BACKOFF_FACTOR, backoffFactor * 2 || 2);
      fetchIntervalMs = 60 * 1000 * backoffFactor;
      console.warn(
        `⚠️ 429 received. Increasing fetch interval to ${fetchIntervalMs / 1000}s (backoff x${backoffFactor}).`
      );
      if (lastSuccessfulData?.length) {
        io.emit("attackData", lastSuccessfulData);
      } else {
        io.emit("attackData", simulatedAttacks(10));
      }
    } else if (status === 401) {
      console.error("❌ 401 Unauthorized — check ABUSEIPDB_KEY in backend/.env");
      io.emit("attackData", simulatedAttacks(10));
    } else {
      if (lastSuccessfulData?.length) {
        io.emit("attackData", lastSuccessfulData);
      } else {
        io.emit("attackData", simulatedAttacks(10));
      }
      backoffFactor = Math.min(MAX_BACKOFF_FACTOR, backoffFactor + 1);
      fetchIntervalMs = 60 * 1000 * backoffFactor;
    }
  }
}

let fetchTimeout = null;
function scheduleLoop() {
  if (fetchTimeout) clearTimeout(fetchTimeout);
  fetchTimeout = setTimeout(async () => {
    await fetchAndEmit();
    scheduleLoop();
  }, fetchIntervalMs);
}

fetchAndEmit()
  .catch((err) => console.error("Initial fetch error:", err.message))
  .finally(() => scheduleLoop());

// ✅ Emit stored DB history to clients on connect
io.on("connection", async (socket) => {
  console.log("🔌 Client connected:", socket.id);

  // If DB connected, send last N events to client otherwise fallback
  if (mongoose.connection.readyState === 1) {
    const last = await Attack.find({}).sort({ timestamp: -1 }).limit(50).lean().exec();
    socket.emit("attackData", last.reverse());
  } else {
    socket.emit("attackData", simulatedAttacks(10));
  }

  socket.on("disconnect", () => console.log("🔌 Client disconnected:", socket.id));
});

server.listen(PORT, () =>
  console.log(`✅ Backend running on http://localhost:${PORT}`)
);
