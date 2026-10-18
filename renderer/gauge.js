/**
 * Speedometer Gauge with progressive logarithmic scaling and glowing canvas renderer
 */
class SpeedGauge {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // Scale breakpoints for tick marks & non-linear gauge
    this.ticks = [0, 5, 10, 25, 50, 100, 250, 500, 1000];
    
    this.currentValue = 0;
    this.targetValue = 0;
    this.mode = 'idle'; // 'download', 'upload', 'ping', 'idle'
    
    this.setupHiDPI();
    this.startAnimationLoop();
  }

  setupHiDPI() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || 360;
    const height = rect.height || 290;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);
    this.displayWidth = width;
    this.displayHeight = height;
  }

  setSpeed(mbps, mode = null) {
    this.targetValue = Math.max(0, mbps);
    if (mode) this.mode = mode;
  }

  reset() {
    this.targetValue = 0;
    this.currentValue = 0;
    this.mode = 'idle';
  }

  // Map speed to progress fraction [0, 1]
  speedToFraction(speed) {
    if (speed <= 0) return 0;
    if (speed >= 1000) return 1;

    for (let i = 0; i < this.ticks.length - 1; i++) {
      const low = this.ticks[i];
      const high = this.ticks[i + 1];
      if (speed >= low && speed <= high) {
        const segFrac = (speed - low) / (high - low);
        return (i + segFrac) / (this.ticks.length - 1);
      }
    }
    return 1;
  }

  startAnimationLoop() {
    const render = () => {
      // Smooth lerp easing for needle
      const delta = this.targetValue - this.currentValue;
      this.currentValue += delta * 0.12;

      this.draw();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  getColorTheme() {
    if (this.mode === 'download') {
      return {
        main: '#00f2fe',
        gradientStart: '#00f2fe',
        gradientEnd: '#4facfe',
        glow: 'rgba(0, 242, 254, 0.4)'
      };
    } else if (this.mode === 'upload') {
      return {
        main: '#f72585',
        gradientStart: '#9d4edd',
        gradientEnd: '#f72585',
        glow: 'rgba(247, 37, 133, 0.4)'
      };
    } else if (this.mode === 'ping') {
      return {
        main: '#fbbf24',
        gradientStart: '#f59e0b',
        gradientEnd: '#fbbf24',
        glow: 'rgba(251, 191, 36, 0.4)'
      };
    }
    return {
      main: '#38bdf8',
      gradientStart: '#38bdf8',
      gradientEnd: '#818cf8',
      glow: 'rgba(56, 189, 248, 0.2)'
    };
  }

  draw() {
    const ctx = this.ctx;
    const width = this.displayWidth;
    const height = this.displayHeight;

    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height * 0.58;
    const radius = Math.min(centerX, centerY) * 0.88;

    const startAngle = Math.PI * 0.75; // 135 deg
    const endAngle = Math.PI * 2.25;   // 405 deg (span of 270 deg)
    const totalSpan = endAngle - startAngle;

    const fraction = this.speedToFraction(this.currentValue);
    const activeAngle = startAngle + totalSpan * fraction;

    const theme = this.getColorTheme();

    // 1. Background Inactive Arc Track
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.stroke();
    ctx.restore();

    // 2. Glowing Active Speed Arc
    if (fraction > 0.005) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, activeAngle);
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';

      const gradient = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
      gradient.addColorStop(0, theme.gradientStart);
      gradient.addColorStop(1, theme.gradientEnd);

      ctx.strokeStyle = gradient;
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Ticks and Labels
    const numTicks = this.ticks.length;
    for (let i = 0; i < numTicks; i++) {
      const tickFrac = i / (numTicks - 1);
      const angle = startAngle + totalSpan * tickFrac;
      const isMajor = true;

      // Tick line
      const innerR = radius - 18;
      const outerR = radius - 8;

      const x1 = centerX + Math.cos(angle) * innerR;
      const y1 = centerY + Math.sin(angle) * innerR;
      const x2 = centerX + Math.cos(angle) * outerR;
      const y2 = centerY + Math.sin(angle) * outerR;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = tickFrac <= fraction ? theme.main : 'rgba(255, 255, 255, 0.2)';
      ctx.stroke();

      // Tick Text
      const textR = radius - 30;
      const tx = centerX + Math.cos(angle) * textR;
      const ty = centerY + Math.sin(angle) * textR;

      ctx.font = '600 10px -apple-system, sans-serif';
      ctx.fillStyle = tickFrac <= fraction ? '#ffffff' : 'rgba(255, 255, 255, 0.35)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.ticks[i].toString(), tx, ty);
      ctx.restore();
    }

    // 4. Center Needle Pointer
    ctx.save();
    const needleAngle = activeAngle;
    const needleLength = radius - 38;

    // Needle pivot circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = theme.main;
    ctx.lineWidth = 3;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.stroke();

    // Needle pointer tip
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    const nx = centerX + Math.cos(needleAngle) * needleLength;
    const ny = centerY + Math.sin(needleAngle) * needleLength;
    ctx.lineTo(nx, ny);
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = theme.main;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 14;
    ctx.stroke();

    // Needle center glow dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }
}

window.SpeedGauge = SpeedGauge;
