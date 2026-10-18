# ⚡ Network ko speed

A high-precision, real-time network speed testing application built with **Node.js**, **Electron**, and modern HTML5 Canvas graphics. Ready to run locally as a desktop GUI or globally hosted on **Vercel**.

---

## ✨ Features

- **Mobile-Responsive**: Fully responsive layout optimized for mobile smartphones, tablets, and desktop displays.
- **Dark Mode & Light Mode**: Seamless theme switcher with persistent local storage preferences.
- **Custom Glowing Cybernetic Cursor**: Fluid, glowing pointer aura with interactive physics (automatically disabled on mobile touch screens).
- **Dynamic Speedometer Gauge**: Custom canvas-rendered analog & digital speedometer with smooth spring animations, glowing arcs, and logarithmic scale (0 to 1,000+ Mbps).
- **Live Throughput Waveform Chart**: Real-time bezier curve graph plotting live bandwidth spikes and saturation over time.
- **Accurate Multi-Stream Testing**:
  - **Latency (Ping)**: High-resolution millisecond round-trip time measurements.
  - **Jitter**: RFC 3550 standard packet delay variation calculation.
  - **Download Speed**: Multi-stream concurrent chunk streaming with 450ms rolling window instant speed and peak calculation.
  - **Upload Speed**: Multi-stream chunk payloads measuring outbound pipe capacity.
- **Network Metadata Detection**:
  - Local interface & connection detection (IPv4 / connection quality).
  - Public IP, Country, and nearest Cloudflare Edge data center identification.
- **Connection Grading & Quality Rating**:
  - Automated analysis assessing suitability for 4K/8K video streaming, pro esports gaming, video conferencing, and cloud workloads.
- **Session History & Export**:
  - Persists recent test runs in local storage.
  - One-click formatted summary copy to clipboard.

---

## 🚀 Desktop Usage

To launch the desktop application:
```powershell
npm start
```

---

## 🌐 Deploy to Vercel

The project includes `vercel.json` pre-configured to deploy the web interface statically to Vercel without needing complex build steps.

Live production URL: **https://network-topaz-eight.vercel.app**
