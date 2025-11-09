import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import geoip from "geoip-lite";
import axios from "axios";
import { aggregateFeeds } from "./services/threatFeeds.js";
import Attack from "./models/Attack.js";

dotenv.config();

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "";
const ABUSEIPDB_KEY = process.env.ABUSEIPDB_KEY || "";

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(rateLimit({ windowMs: 60 * 1000, max: 60 }));

app.get("/", (req, res) => res.send("🚀 Backend running!"));

if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB connection error:", err.message));
}

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

function ipToLatLon(ipAddr) {
  const geo = geoip.lookup(ipAddr);
  if (geo?.ll) return { lat: geo.ll[0], lon: geo.ll[1] };
  return { lat: Math.random() * 180 - 90, lon: Math.random() * 360 - 180 };
}

async function fetchAbuseIpDb() {
  const res = await axios.get("https://api.abuseipdb.com/api/v2/blacklist", {
    headers: { Key: ABUSEIPDB_KEY, Accept: "application/json" },
  });
  return res.data.data || [];
}

function buildAttacks(rows) {
  return rows.slice(0, 20).map((r) => {
    const ip = r.ipAddress || "0.0.0.0";
    const { lat, lon } = ipToLatLon(ip);
    return {
      id: `${ip}-${Date.now()}`,
      ip,
      lat,
      lon,
      country: r.countryCode || "??",
      confidence: r.confidence || 0,
      source: "abuseipdb",
      timestamp: new Date(),
    };
  });
}

async function fetchAndEmit() {
  try {
    const rows = await fetchAbuseIpDb();
    const attacks = buildAttacks(rows);
    io.emit("attackData", attacks);
    console.log(`✅ Emitted ${attacks.length} attacks`);
  } catch (err) {
    console.error("❌ API error:", err.message);
  }
}

io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
});

async function startServer() {
  await fetchAndEmit();
  setInterval(fetchAndEmit, 60 * 1000);
  server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
}

startServer();
