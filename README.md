# ⚡ Network Velocity — Speed Checker (Desktop & Web)

A high-precision, real-time network speed testing application built with **Node.js**, **Electron**, and modern HTML5 Canvas graphics. Ready to run locally as a desktop GUI or deploy directly to **Vercel** as a web app.

---

## ✨ Features

- **Dual-Mode**: Runs seamlessly as a desktop app (via Electron) or as a globally hosted web application (via Vercel).
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

The project includes `vercel.json` and `.vercelignore` pre-configured to deploy the web interface statically to Vercel without needing complex build steps.

### Method 1: Using the Vercel CLI (Quickest)
Run in the project directory:
```powershell
vercel
```
Or for immediate production deployment:
```powershell
vercel --prod
```

### Method 2: Deploying via GitHub / Git
1. Push this directory to your GitHub repository:
   ```powershell
   git init
   git add .
   git commit -m "Initial commit of Network Velocity"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. Open [Vercel Dashboard](https://vercel.com/new).
3. Import your repository. Vercel will automatically read `vercel.json`, set the output directory to `renderer`, and deploy your live URL.
