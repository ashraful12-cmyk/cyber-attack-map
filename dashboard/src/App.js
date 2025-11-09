import React, { useEffect, useRef, useState } from "react";
import Globe from "globe.gl";
import { io } from "socket.io-client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ✅ Use environment variable or fallback
const SOCKET_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";
const API_BASE = SOCKET_URL.replace(/\/$/, ""); // remove trailing slash if any

// ✅ Connect to backend WebSocket
const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
});

function App() {
  const globeRef = useRef(null);
  const [attacks, setAttacks] = useState([]);

  // 🌍 Initialize globe once
  useEffect(() => {
    if (!globeRef.current) return;

    const globe = Globe()(globeRef.current)
      .globeImageUrl(`${process.env.PUBLIC_URL}/earth-night.jpg`)
      .bumpImageUrl(`${process.env.PUBLIC_URL}/earth-topology.png`)
      .backgroundColor("#000010")
      .showAtmosphere(true)
      .atmosphereColor("lightblue")
      .atmosphereAltitude(0.25)
      .arcColor(() => ["#ff0000", "#00ffff"])
      .arcDashLength(0.5)
      .arcDashGap(1)
      .arcDashAnimateTime(2000)
      .pointAltitude(0.03)
      .pointColor(() => "orange");

    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    controls.enableZoom = true;
    controls.enablePan = true;

    globeRef.current.__globeInstance__ = globe;

    return () => {
      socket.off("attackData");
    };
  }, []);

  // 🧠 Fetch initial attack history (optional but recommended)
  useEffect(() => {
    fetch("/api/attacks?limit=100")
      .then((res) => res.json())
      .then((json) => {
        if (json && json.data) {
          console.log("📜 Loaded historical attacks:", json.data.length);
          setAttacks(json.data);

          const arcs = json.data.map((a) => ({
            startLat: a.lat,
            startLng: a.lon,
            endLat: a.lat + (Math.random() - 0.5) * 15,
            endLng: a.lon + (Math.random() - 0.5) * 15,
            color: ["#ff0044", "#00ffff"],
          }));

          const globe = globeRef.current.__globeInstance__;
          if (globe) globe.arcsData(arcs);
        }
      })
      .catch((err) => console.warn("❌ History fetch failed:", err.message));
  }, []);

  // 🛰️ Live socket data
  useEffect(() => {
    socket.on("attackData", (data) => {
      console.log("🛰️ Received live attack data:", data);
      setAttacks(data);

      const arcs = data.map((a) => ({
        startLat: a.lat,
        startLng: a.lon,
        endLat: a.lat + (Math.random() - 0.5) * 15,
        endLng: a.lon + (Math.random() - 0.5) * 15,
        color: ["#ff0044", "#00ffff"],
      }));

      const globe = globeRef.current.__globeInstance__;
      if (globe) globe.arcsData(arcs);
    });

    return () => socket.off("attackData");
  }, []);

  // 📊 Example chart data
  const chartData = [
    { name: "UDP Floods", value: 40 },
    { name: "TCP Floods", value: 25 },
    { name: "Data Theft", value: 20 },
    { name: "Exploits", value: 15 },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-black text-white">
      <h1 className="text-2xl font-bold mb-4 text-cyan-400">
        🌐 Live Cyber Attack Dashboard
      </h1>

      {/* 🌎 3D Globe */}
      <div
        ref={globeRef}
        className="w-full max-w-5xl h-[600px] bg-black rounded-xl overflow-hidden mb-6 border border-cyan-700 shadow-lg"
      />

      {/* 📊 Chart */}
      <div className="w-full max-w-3xl bg-gray-900 p-4 rounded-2xl shadow-xl">
        <h2 className="text-xl font-semibold mb-2 text-green-400">
          Top Attack Vectors
        </h2>
        <div style={{ width: "100%", height: "250px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="name" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00ffff"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="mt-4 text-gray-400">
        Live attack feed — Active attacks:{" "}
        <span className="text-cyan-400 font-semibold">{attacks.length}</span>
      </p>
    </div>
  );
}

export default App;
