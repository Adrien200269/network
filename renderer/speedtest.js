/**
 * Core Network Speed Test Engine, UI Controller, Theme & Glowing Cursor
 */

// Global UI Elements
const statusPill = document.getElementById('statusPill');
const statusText = document.getElementById('statusText');
const startBtn = document.getElementById('startBtn');
const startBtnLabel = document.getElementById('startBtnLabel');
const themeToggleBtn = document.getElementById('themeToggleBtn');

const metaIp = document.getElementById('metaIp');
const metaLocation = document.getElementById('metaLocation');
const metaInterface = document.getElementById('metaInterface');
const metaProvider = document.getElementById('metaProvider');

const phaseTag = document.getElementById('phaseTag');
const currentSpeedVal = document.getElementById('currentSpeedVal');
const peakIndicator = document.getElementById('peakIndicator');

const valDownload = document.getElementById('valDownload');
const subPeakDl = document.getElementById('subPeakDl');
const subDataDl = document.getElementById('subDataDl');
const fillDl = document.getElementById('fillDl');

const valUpload = document.getElementById('valUpload');
const subPeakUl = document.getElementById('subPeakUl');
const subDataUl = document.getElementById('subDataUl');
const fillUl = document.getElementById('fillUl');

const valPing = document.getElementById('valPing');
const subMinPing = document.getElementById('subMinPing');
const subMaxPing = document.getElementById('subMaxPing');
const fillPing = document.getElementById('fillPing');

const valJitter = document.getElementById('valJitter');
const subStability = document.getElementById('subStability');
const subSamples = document.getElementById('subSamples');
const fillJitter = document.getElementById('fillJitter');

const verdictBanner = document.getElementById('verdictBanner');
const verdictIcon = document.getElementById('verdictIcon');
const verdictText = document.getElementById('verdictText');

const historyTbody = document.getElementById('historyTbody');
const copyResultsBtn = document.getElementById('copyResultsBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// Cursor Elements
const cursorGlow = document.getElementById('cursorGlow');

// Initialize visual components
let gauge;
let liveChart;
let abortController = null;
let isRunning = false;
let currentResults = null;

// Airport/Datacenter code to City Map for Cloudflare colos
const COLO_MAP = {
  SIN: 'Singapore',
  DEL: 'New Delhi, India',
  BOM: 'Mumbai, India',
  KTM: 'Kathmandu, Nepal',
  CCU: 'Kolkata, India',
  MAA: 'Chennai, India',
  HKG: 'Hong Kong',
  NRT: 'Tokyo, Japan',
  LHR: 'London, UK',
  FRA: 'Frankfurt, Germany',
  SJC: 'San Jose, USA',
  LAX: 'Los Angeles, USA',
  JFK: 'New York, USA'
};

document.addEventListener('DOMContentLoaded', async () => {
  // Theme initialization
  initTheme();

  // Glowing custom cursor initialization
  initGlowingCursor();

  gauge = new window.SpeedGauge('gaugeCanvas');
  liveChart = new window.LiveThroughputChart('liveChartCanvas');

  loadHistory();
  await detectNetworkInfo();

  startBtn.addEventListener('click', toggleTest);
  copyResultsBtn.addEventListener('click', copySummaryToClipboard);
  clearHistoryBtn.addEventListener('click', clearHistory);
  themeToggleBtn.addEventListener('click', toggleTheme);
});

// =========================================================
// THEME MANAGEMENT (LIGHT / DARK MODE)
// =========================================================
function initTheme() {
  const savedTheme = localStorage.getItem('theme_preference') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('theme_preference', isLight ? 'light' : 'dark');

  // Redraw canvas components with the new theme colors
  if (gauge) {
    gauge.setupHiDPI();
    gauge.draw();
  }
  if (liveChart) {
    liveChart.setupHiDPI();
    liveChart.draw();
  }
}

// =========================================================
// GLOWING EFFECT FOR NORMAL CURSOR
// =========================================================
function initGlowingCursor() {
  if (!cursorGlow) return;
  // If touch device, ignore custom glow effect
  if (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
    return;
  }

  let mouseX = -100;
  let mouseY = -100;
  let glowX = -100;
  let glowY = -100;
  let isVisible = false;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!isVisible) {
      isVisible = true;
      cursorGlow.style.opacity = '1';
      glowX = mouseX;
      glowY = mouseY;
    }
  });

  document.addEventListener('mouseleave', () => {
    isVisible = false;
    cursorGlow.style.opacity = '0';
  });

  // Smooth lerp trailing animation loop for the glowing halo
  function animateGlow() {
    if (isVisible) {
      glowX += (mouseX - glowX) * 0.22;
      glowY += (mouseY - glowY) * 0.22;

      cursorGlow.style.left = `${glowX}px`;
      cursorGlow.style.top = `${glowY}px`;
    }

    requestAnimationFrame(animateGlow);
  }
  requestAnimationFrame(animateGlow);

  // Interactive Hover Targets (enlarges and shifts glow color)
  const interactiveSelector = 'button, a, input, .metric-card, canvas, .theme-toggle-btn, .secondary-btn, .primary-btn';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactiveSelector)) {
      document.body.classList.add('cursor-hover');
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactiveSelector)) {
      document.body.classList.remove('cursor-hover');
    }
  });

  document.addEventListener('mousedown', () => {
    document.body.classList.add('cursor-click');
  });

  document.addEventListener('mouseup', () => {
    document.body.classList.remove('cursor-click');
  });
}

// =========================================================
// NETWORK METADATA DETECTION
// =========================================================
async function detectNetworkInfo() {
  try {
    // 1. Get system local interface via Electron IPC if available, or browser network info
    if (window.electronAPI && window.electronAPI.getSystemInfo) {
      const sysInfo = await window.electronAPI.getSystemInfo();
      if (sysInfo.interfaces && sysInfo.interfaces.length > 0) {
        const primary = sysInfo.interfaces[0];
        metaInterface.textContent = `${primary.ip} (${primary.interface})`;
      } else {
        metaInterface.textContent = sysInfo.hostname || 'Local Network';
      }
    } else {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn && conn.effectiveType) {
        const eff = conn.effectiveType.toUpperCase();
        metaInterface.textContent = `Browser (${eff}${conn.rtt ? ` ~${conn.rtt}ms` : ''})`;
      } else {
        metaInterface.textContent = 'Browser Client';
      }
    }

    // 2. Query Cloudflare Edge trace
    const res = await fetch('https://speed.cloudflare.com/cdn-cgi/trace', { cache: 'no-store' });
    const text = await res.text();
    const lines = text.split('\n');
    const trace = {};
    for (const line of lines) {
      const [k, v] = line.split('=');
      if (k && v) trace[k.trim()] = v.trim();
    }

    if (trace.ip) {
      metaIp.textContent = trace.ip;
    }

    const coloName = COLO_MAP[trace.colo] || trace.colo || 'Edge CDN';
    const locName = trace.loc ? ` (${trace.loc})` : '';
    metaLocation.textContent = `${coloName}${locName}`;

    metaProvider.textContent = 'Cloudflare Global Edge';
  } catch (err) {
    console.warn('Network detection warning:', err);
    metaIp.textContent = 'Connected (IPv4/IPv6)';
    metaLocation.textContent = 'Global Edge CDN';
  }
}

// =========================================================
// START / STOP TEST PIPELINE
// =========================================================
async function toggleTest() {
  if (isRunning) {
    stopTest('Cancelled by user');
    return;
  }

  startTest();
}

function stopTest(reason = null) {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  isRunning = false;
  startBtn.classList.remove('cancel-mode');
  startBtnLabel.textContent = 'START TEST';
  statusPill.classList.remove('testing');
  statusText.textContent = reason || 'Ready';
  phaseTag.textContent = 'STANDBY';
  gauge.setSpeed(0, 'idle');
}

async function startTest() {
  isRunning = true;
  abortController = new AbortController();
  const signal = abortController.signal;

  // Reset UI
  startBtn.classList.add('cancel-mode');
  startBtnLabel.textContent = 'STOP TEST';
  statusPill.classList.add('testing');
  statusText.textContent = 'Testing in progress...';
  verdictBanner.style.borderColor = 'var(--card-border)';
  verdictIcon.textContent = '⚡';
  verdictText.textContent = 'Analyzing connection telemetry...';

  resetMetrics();
  gauge.reset();
  liveChart.reset();

  const results = {
    timestamp: new Date().toISOString(),
    ping: 0,
    minPing: 0,
    maxPing: 0,
    jitter: 0,
    download: 0,
    peakDownload: 0,
    downloadBytes: 0,
    upload: 0,
    peakUpload: 0,
    uploadBytes: 0
  };

  try {
    // ----------------------------------------------------
    // PHASE 1: Latency & Jitter Test
    // ----------------------------------------------------
    phaseTag.textContent = 'TESTING PING & JITTER';
    statusText.textContent = 'Pinging Edge Server...';
    gauge.setSpeed(0, 'ping');

    const pingStats = await measurePingAndJitter(signal, (currentPing, sampleIdx) => {
      currentSpeedVal.textContent = currentPing.toFixed(0);
      valPing.textContent = currentPing.toFixed(0);
      subSamples.textContent = sampleIdx;
      fillPing.style.width = `${Math.min(100, (currentPing / 150) * 100)}%`;
    });

    results.ping = pingStats.avg;
    results.minPing = pingStats.min;
    results.maxPing = pingStats.max;
    results.jitter = pingStats.jitter;

    valPing.textContent = pingStats.avg.toFixed(0);
    subMinPing.textContent = pingStats.min.toFixed(0);
    subMaxPing.textContent = pingStats.max.toFixed(0);
    fillPing.style.width = '100%';

    valJitter.textContent = pingStats.jitter.toFixed(1);
    subStability.textContent = pingStats.jitter < 4 ? 'Superb' : (pingStats.jitter < 12 ? 'Good' : 'Moderate');
    fillJitter.style.width = '100%';

    if (signal.aborted) return;

    await delay(350);

    // ----------------------------------------------------
    // PHASE 2: Download Speed Test
    // ----------------------------------------------------
    phaseTag.textContent = 'DOWNLOAD SPEED';
    statusText.textContent = 'Testing Download Speed...';
    gauge.setSpeed(0, 'download');

    const downloadStats = await measureDownloadSpeed(signal, (speedMbps, peakMbps, totalBytes) => {
      currentSpeedVal.textContent = speedMbps.toFixed(1);
      peakIndicator.textContent = `Peak: ${peakMbps.toFixed(1)} Mbps`;
      gauge.setSpeed(speedMbps, 'download');
      liveChart.addPoint(speedMbps, 'download');

      valDownload.textContent = speedMbps.toFixed(2);
      subPeakDl.textContent = peakMbps.toFixed(2);
      subDataDl.textContent = (totalBytes / (1024 * 1024)).toFixed(1);
      fillDl.style.width = `${Math.min(100, (speedMbps / 150) * 100)}%`;
    });

    results.download = downloadStats.avg;
    results.peakDownload = downloadStats.peak;
    results.downloadBytes = downloadStats.totalBytes;

    valDownload.textContent = downloadStats.avg.toFixed(2);
    subPeakDl.textContent = downloadStats.peak.toFixed(2);
    subDataDl.textContent = (downloadStats.totalBytes / (1024 * 1024)).toFixed(1);
    fillDl.style.width = '100%';

    if (signal.aborted) return;

    await delay(450);

    // ----------------------------------------------------
    // PHASE 3: Upload Speed Test
    // ----------------------------------------------------
    phaseTag.textContent = 'UPLOAD SPEED';
    statusText.textContent = 'Testing Upload Speed...';
    gauge.setSpeed(0, 'upload');

    const uploadStats = await measureUploadSpeed(signal, (speedMbps, peakMbps, totalBytes) => {
      currentSpeedVal.textContent = speedMbps.toFixed(1);
      peakIndicator.textContent = `Peak: ${peakMbps.toFixed(1)} Mbps`;
      gauge.setSpeed(speedMbps, 'upload');
      liveChart.addPoint(speedMbps, 'upload');

      valUpload.textContent = speedMbps.toFixed(2);
      subPeakUl.textContent = peakMbps.toFixed(2);
      subDataUl.textContent = (totalBytes / (1024 * 1024)).toFixed(1);
      fillUl.style.width = `${Math.min(100, (speedMbps / 100) * 100)}%`;
    });

    results.upload = uploadStats.avg;
    results.peakUpload = uploadStats.peak;
    results.uploadBytes = uploadStats.totalBytes;

    valUpload.textContent = uploadStats.avg.toFixed(2);
    subPeakUl.textContent = uploadStats.peak.toFixed(2);
    subDataUl.textContent = (uploadStats.totalBytes / (1024 * 1024)).toFixed(1);
    fillUl.style.width = '100%';

    if (signal.aborted) return;

    // ----------------------------------------------------
    // PHASE 4: Completion & Rating
    // ----------------------------------------------------
    phaseTag.textContent = 'TEST FINISHED';
    statusPill.classList.remove('testing');
    statusText.textContent = 'Completed';
    currentSpeedVal.textContent = results.download.toFixed(1);
    gauge.setSpeed(results.download, 'download');

    currentResults = results;
    computeVerdict(results);
    saveHistory(results);

  } catch (err) {
    if (signal.aborted) {
      console.log('Speed test cancelled.');
    } else {
      console.error('Speed test error:', err);
      statusText.textContent = 'Test Failed';
      verdictBanner.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      verdictIcon.textContent = '❌';
      verdictText.textContent = `Network error during test: ${err.message || 'Connection lost'}`;
    }
  } finally {
    isRunning = false;
    startBtn.classList.remove('cancel-mode');
    startBtnLabel.textContent = 'START TEST';
    abortController = null;
  }
}

// Latency & Jitter algorithm
async function measurePingAndJitter(signal, onProgress) {
  const pings = [];
  const samples = 10;

  for (let i = 0; i < samples; i++) {
    if (signal.aborted) break;

    const t0 = performance.now();
    try {
      await fetch(`https://speed.cloudflare.com/cdn-cgi/trace?cachebust=${Date.now()}_${i}`, {
        cache: 'no-store',
        signal
      });
      const t1 = performance.now();
      const rtt = Math.max(1, t1 - t0);
      pings.push(rtt);
      onProgress(rtt, i + 1);
    } catch (e) {
      if (signal.aborted) break;
    }
    await delay(70);
  }

  if (pings.length === 0) return { avg: 0, min: 0, max: 0, jitter: 0 };

  const min = Math.min(...pings);
  const max = Math.max(...pings);
  const sum = pings.reduce((a, b) => a + b, 0);
  const avg = sum / pings.length;

  let jitterSum = 0;
  for (let i = 1; i < pings.length; i++) {
    jitterSum += Math.abs(pings[i] - pings[i - 1]);
  }
  const jitter = pings.length > 1 ? jitterSum / (pings.length - 1) : 0;

  return { avg, min, max, jitter };
}

// Download speed test with multi-stream saturation
async function measureDownloadSpeed(signal, onProgress) {
  const testDurationMs = 7500;
  const startTime = performance.now();
  let totalBytes = 0;
  let peakSpeed = 0;

  const windowSamples = [];
  const streamCount = 3;

  async function downloadWorker() {
    while (performance.now() - startTime < testDurationMs && !signal.aborted) {
      try {
        const res = await fetch(`https://speed.cloudflare.com/__down?bytes=12000000&cb=${Date.now()}`, {
          cache: 'no-store',
          signal
        });

        const reader = res.body.getReader();
        while (true) {
          if (signal.aborted) {
            reader.cancel();
            break;
          }
          const { done, value } = await reader.read();
          if (done) break;

          const now = performance.now();
          const bytes = value.length;
          totalBytes += bytes;

          windowSamples.push({ t: now, bytes });

          while (windowSamples.length > 0 && now - windowSamples[0].t > 450) {
            windowSamples.shift();
          }

          if (windowSamples.length > 1) {
            const windowDuration = (now - windowSamples[0].t) / 1000;
            if (windowDuration > 0.05) {
              const windowBytes = windowSamples.reduce((acc, s) => acc + s.bytes, 0);
              const instantSpeed = (windowBytes * 8) / windowDuration / 1e6;
              peakSpeed = Math.max(peakSpeed, instantSpeed);
              onProgress(instantSpeed, peakSpeed, totalBytes);
            }
          }

          if (now - startTime >= testDurationMs) {
            reader.cancel();
            break;
          }
        }
      } catch (err) {
        if (signal.aborted) break;
        await delay(50);
      }
    }
  }

  const workers = Array.from({ length: streamCount }, () => downloadWorker());
  await Promise.all(workers);

  const totalDuration = (performance.now() - startTime) / 1000;
  const overallAvg = totalDuration > 0 ? (totalBytes * 8) / totalDuration / 1e6 : 0;

  return {
    avg: overallAvg,
    peak: peakSpeed || overallAvg,
    totalBytes
  };
}

// Upload speed test with multi-stream POST payloads
async function measureUploadSpeed(signal, onProgress) {
  const testDurationMs = 6500;
  const startTime = performance.now();
  let totalBytes = 0;
  let peakSpeed = 0;

  const chunkSize = 2000000; // 2MB
  const chunkBuffer = new Uint8Array(chunkSize);
  for (let i = 0; i < chunkSize; i += 1024) {
    chunkBuffer[i] = (i % 256);
  }

  const windowSamples = [];
  const streamCount = 2;

  async function uploadWorker() {
    while (performance.now() - startTime < testDurationMs && !signal.aborted) {
      try {
        const postStart = performance.now();
        const res = await fetch(`https://speed.cloudflare.com/__up?cb=${Date.now()}`, {
          method: 'POST',
          body: chunkBuffer,
          cache: 'no-store',
          signal
        });
        await res.text();

        const postEnd = performance.now();
        const bytes = chunkSize;
        totalBytes += bytes;

        windowSamples.push({ t: postEnd, bytes });
        while (windowSamples.length > 0 && postEnd - windowSamples[0].t > 600) {
          windowSamples.shift();
        }

        const windowDuration = (postEnd - windowSamples[0].t) / 1000;
        if (windowDuration > 0.05) {
          const windowBytes = windowSamples.reduce((acc, s) => acc + s.bytes, 0);
          const instantSpeed = (windowBytes * 8) / windowDuration / 1e6;
          peakSpeed = Math.max(peakSpeed, instantSpeed);
          onProgress(instantSpeed, peakSpeed, totalBytes);
        }
      } catch (err) {
        if (signal.aborted) break;
        await delay(50);
      }
    }
  }

  const workers = Array.from({ length: streamCount }, () => uploadWorker());
  await Promise.all(workers);

  const totalDuration = (performance.now() - startTime) / 1000;
  const overallAvg = totalDuration > 0 ? (totalBytes * 8) / totalDuration / 1e6 : 0;

  return {
    avg: overallAvg,
    peak: peakSpeed || overallAvg,
    totalBytes
  };
}

// Evaluate connection quality & assign Grade
function computeVerdict(res) {
  let grade = 'A';
  let gradeClass = 'grade-a';
  let comment = '';

  const dl = res.download;
  const ping = res.ping;

  if (dl >= 150 && ping <= 35) {
    grade = 'A+';
    gradeClass = 'grade-a';
    comment = 'Ultra-fast Gigabit/Fiber class. Perfect for 4K/8K streaming, pro esports, and instant large file transfers.';
  } else if (dl >= 50 && ping <= 60) {
    grade = 'A';
    gradeClass = 'grade-a';
    comment = 'Excellent broadband connection. Ideal for seamless 4K video, smooth online multiplayer gaming, and multi-user video meetings.';
  } else if (dl >= 25 && ping <= 90) {
    grade = 'B';
    gradeClass = 'grade-b';
    comment = 'Good standard broadband. Easily handles full HD 1080p streaming, Zoom calls, and everyday browsing.';
  } else if (dl >= 8) {
    grade = 'C';
    gradeClass = 'grade-c';
    comment = 'Moderate network speed. Sufficient for regular web surfing and video calls, but large downloads may take time.';
  } else {
    grade = 'D';
    gradeClass = 'grade-d';
    comment = 'Slow connection detected. You may experience buffering, high latency, or dropped video frames.';
  }

  res.grade = grade;
  res.gradeClass = gradeClass;

  verdictIcon.textContent = grade === 'A+' || grade === 'A' ? '🚀' : (grade === 'B' ? '📶' : '⚠️');
  verdictBanner.style.borderColor = grade.startsWith('A') ? 'rgba(0, 242, 254, 0.4)' : 'var(--card-border)';
  verdictText.innerHTML = `<strong>Rating [${grade}]:</strong> ${comment}`;
}

// History Management
function saveHistory(res) {
  try {
    const list = JSON.parse(localStorage.getItem('speedtest_history') || '[]');
    list.unshift({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      download: res.download.toFixed(1),
      upload: res.upload.toFixed(1),
      ping: res.ping.toFixed(0),
      jitter: res.jitter.toFixed(1),
      grade: res.grade,
      gradeClass: res.gradeClass
    });

    if (list.length > 15) list.pop();
    localStorage.setItem('speedtest_history', JSON.stringify(list));
    renderHistory(list);
  } catch (e) {
    console.error('History save error:', e);
  }
}

function loadHistory() {
  try {
    const list = JSON.parse(localStorage.getItem('speedtest_history') || '[]');
    renderHistory(list);
  } catch (e) {
    console.error('History load error:', e);
  }
}

function renderHistory(list) {
  if (!list || list.length === 0) {
    historyTbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">No previous tests recorded yet. Run a test to save history!</td>
      </tr>
    `;
    return;
  }

  historyTbody.innerHTML = list.map(item => `
    <tr>
      <td>${item.time}</td>
      <td style="color: var(--accent-cyan); font-weight: 600;">${item.download} Mbps</td>
      <td style="color: var(--accent-purple); font-weight: 600;">${item.upload} Mbps</td>
      <td>${item.ping} ms</td>
      <td>${item.jitter} ms</td>
      <td><span class="grade-badge ${item.gradeClass}">${item.grade}</span></td>
    </tr>
  `).join('');
}

function clearHistory() {
  localStorage.removeItem('speedtest_history');
  renderHistory([]);
}

function copySummaryToClipboard() {
  if (!currentResults) {
    alert('Please run a speed test first!');
    return;
  }

  const summary = `
========================================
⚡ NETWORK KO SPEED - SPEED TEST REPORT
========================================
Date: ${new Date().toLocaleString()}
IP: ${metaIp.textContent}
Location: ${metaLocation.textContent}
Interface: ${metaInterface.textContent}

📥 Download: ${currentResults.download.toFixed(2)} Mbps (Peak: ${currentResults.peakDownload.toFixed(2)} Mbps)
📤 Upload:   ${currentResults.upload.toFixed(2)} Mbps (Peak: ${currentResults.peakUpload.toFixed(2)} Mbps)
⏱️ Latency:  ${currentResults.ping.toFixed(0)} ms (Min: ${currentResults.minPing.toFixed(0)} ms, Max: ${currentResults.maxPing.toFixed(0)} ms)
〰️ Jitter:   ${currentResults.jitter.toFixed(1)} ms
🏆 Rating:   ${currentResults.grade}
========================================
Generated by Network ko speed
  `.trim();

  if (window.electronAPI && window.electronAPI.copyToClipboard) {
    window.electronAPI.copyToClipboard(summary);
  } else {
    navigator.clipboard.writeText(summary);
  }

  const origText = copyResultsBtn.innerHTML;
  copyResultsBtn.textContent = '✓ Copied!';
  setTimeout(() => {
    copyResultsBtn.innerHTML = origText;
  }, 2000);
}

function resetMetrics() {
  valDownload.textContent = '0.00';
  subPeakDl.textContent = '0.00';
  subDataDl.textContent = '0';
  fillDl.style.width = '0%';

  valUpload.textContent = '0.00';
  subPeakUl.textContent = '0.00';
  subDataUl.textContent = '0';
  fillUl.style.width = '0%';

  valPing.textContent = '--';
  subMinPing.textContent = '--';
  subMaxPing.textContent = '--';
  fillPing.style.width = '0%';

  valJitter.textContent = '--';
  subStability.textContent = '--';
  subSamples.textContent = '0';
  fillJitter.style.width = '0%';

  peakIndicator.textContent = 'Peak: 0.0 Mbps';
  currentSpeedVal.textContent = '0.0';
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
