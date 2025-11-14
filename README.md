# 🌐 Cyber Attack Map (Real-Time SIEM Dashboard)

A fully automated **real-time cyber attack visualization system** with:
- Live WebSocket attack feed  
- SIEM-style correlation engine  
- Log collectors (Windows, Linux, Firewall, WAF, Filebeat)
- Real attack detection rules  
- SSH, RDP, DDoS, SQLi, XSS detection  
- Dark cyber dashboard with animated attack lines  
- Backend + frontend ready for deployment  

### 🔥 Live Demo  
https://cyber-attack-map-eight.vercel.app/

---

## 🚀 Features

### ✅ Real-Time Cyber Attack Map  
- Shows incoming attacks instantly  
- GeoIP location detection  
- Country flags  
- Animated attack paths  

### ✅ SIEM / SOC Features  
- SSH brute-force detection  
- DDoS flood detection  
- Port scan detection  
- Web attack detection (SQLi, XSS, LFI)  
- Alert correlation  
- Security Event stream  

### ✅ Tech Stack  
**Frontend:** React, TailwindCSS, Framer Motion  
**Backend:** Node.js, Express, WebSocket  
**Database:** MongoDB (Optional)  
**Deployment:** Vercel + Render/Nginx  

---

## 🛠️ Installation

git clone https://github.com/ashraful12-cmyk/cyber-attack-map.git
cd cyber-attack-map

### Backend

cd backend
npm install
npm start

### Frontend

cd dashboard
npm install
npm run dev

---

## 📡 WebSocket Endpoint  
Real-time events are sent from:


ws://your-server:5000

---

## 📁 Project Structure

cyber-attack-map/
│── backend/
│── dashboard/
│── README.md
│── LICENSE

---

## 👨‍💻 Author
**Ashraful — Cybersecurity & SOC Analyst**  
GitHub: https://github.com/ashraful12-cmyk

