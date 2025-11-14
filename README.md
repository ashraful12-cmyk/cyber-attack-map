<div align="center">

# 🌐 Cyber Attack Map  
### **Real-Time SIEM Dashboard with Live WebSocket Attack Feed**

<img src="https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge" />
<img src="https://img.shields.io/badge/Frontend-React-blue?style=for-the-badge" />
<img src="https://img.shields.io/badge/Backend-Node.js-green?style=for-the-badge" />
<img src="https://img.shields.io/badge/WebSocket-Real--Time-orange?style=for-the-badge" />
<img src="https://img.shields.io/badge/SIEM-Engine-purple?style=for-the-badge" />

<br>

A fully automated real-time cyber attack visualization & SIEM-style monitoring system.

</div>

---

## ⚡ Overview

This project is a **real-time Cyber Attack Map + SIEM Dashboard**, designed to visualize global attacks, security alerts, live logs, and threat intelligence using:

- 🔴 **Live WebSocket attack stream**  
- 🛡 **SIEM-style correlation engine**  
- 📊 **Real-time dashboard with map, charts, alerts, logs**  
- ⚙️ **Node.js detection backend**  
- 🌍 **Threat intelligence integrations (GeoIP, Detection Rules)**  

---

## 🚀 Features

### 🛰 Real-Time Capabilities
- Live **WebSocket attack feed**
- Live log stream viewer
- Animated attack events on the map
- Auto-updating charts (MITRE, trends, KPIs)

### 🛡 SIEM Detection Engine
✔ SSH brute-force  
✔ Port scanning  
✔ Web attacks (SQLi, XSS, LFI)  
✔ RDP brute-force attempts  
✔ Firewall events  
✔ Honeypot events  
✔ Authentication failures  

### 📡 Multi-Source Log Collection
- Linux `/var/log/auth.log`
- Windows Event Logs
- Firewall logs
- WAF logs
- Filebeat pipeline support
- Custom JSON log ingestion

### 🧠 Correlation & Alerting
- Custom correlation rules  
- Multi-event anomaly detection  
- Suspicious IP scoring  
- Real-time alert generation pushed to frontend  

---

## 🏗 System Architecture

Linux / Windows Logs ─┐
Firewall / WAF Logs ──┤
Honeypot Events ──────┤
Filebeat / Syslog  ───┘
      ↓

[ Node.js Detection Engine ]


Parser


Correlator


Detection Rules


Alert Generator
  ↓ (WebSocket)

[ React Dashboard ]


Global Attack Map


Live Feed


Log Viewer


MITRE Charts


KPIs





---

## 📸 Screenshots (Add Your Own)

> Replace these image links with real screenshots later.

| Dashboard | Live Map |
|----------|----------|
| ![shot1](https://via.placeholder.com/400x200) | ![shot2](https://via.placeholder.com/400x200) |

---

## 🛠 Installation

### 1. Clone the repository
```bash
git clone https://github.com/ashraful12-cmyk/cyber-attack-map.git
cd cyber-attack-map


⚙ Backend Setup (Node.js)
cd backend
npm install

Create .env
PORT=4000
WS_PORT=4001

Start backend
npm start


💻 Frontend Setup (React)
cd dashboard
npm install
npm run dev

Your dashboard will run at:
http://localhost:5173


🔥 WebSocket Real-Time Attack Feed
No API key needed.
Your backend automatically:


Parses logs


Detects attacks


Generates alerts


Sends them live to dashboard through WebSocket


Example event pushed:
{
  "type": "ssh_bruteforce",
  "ip": "192.168.1.10",
  "country": "US",
  "time": "2025-01-10T12:45:32Z"
}


📚 Tech Stack


Frontend: React + Tailwind + WebSocket Client


Backend: Node.js, Express, WebSocket


Map Engine: Custom SVG-based cyber attack map


Log Input: Linux, Windows, Filebeat, Syslog


Detection Engine: Custom SIEM-style rules



📝 License
MIT

## 📊 Threat Hunting Dashboard Preview

![Threat Hunting Dashboard](assets/dashboard.png)
