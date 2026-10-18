/**
 * Speedometer Gauge with progressive logarithmic scaling, responsive sizing, and light/dark theme adaptation
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
    window.addEventListener('resize', () => {
      this.setupHiDPI();
      this.draw();
    });

    this.startAnimationLoop();
  }

  setupHiDPI() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || 360;
    const height = rect.height || 290;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.resetTransform?.();
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
    const isLight = document.body.classList.contains('light-theme');

    if (this.mode === 'download') {
      return {
        main: isLight ? '#0084d1' : '#00f2fe',
        gradientStart: '#00f2fe',
        gradientEnd: isLight ? '#0284c7' : '#4facfe',
        glow: isLight ? 'rgba(0, 132, 209, 0.4)' : 'rgba(0, 242, 254, 0.4)'
      };
    } else if (this.mode === 'upload') {
      return {
        main: isLight ? '#d90479' : '#f72585',
        gradientStart: '#9d4edd',
        gradientEnd: isLight ? '#d90479' : '#f72585',
        glow: isLight ? 'rgba(217, 4, 121, 0.4)' : 'rgba(247, 37, 133, 0.4)'
      };
    } else if (this.mode === 'ping') {
      return {
        main: isLight ? '#d97706' : '#fbbf24',
        gradientStart: '#f59e0b',
        gradientEnd: isLight ? '#d97706' : '#fbbf24',
        glow: isLight ? 'rgba(217, 119, 6, 0.4)' : 'rgba(251, 191, 36, 0.4)'
      };
    }

    return {
      main: isLight ? '#0284c7' : '#38bdf8',
      gradientStart: '#38bdf8',
      gradientEnd: '#818cf8',
      glow: isLight ? 'rgba(2, 132, 199, 0.3)' : 'rgba(56, 189, 248, 0.25)'
    };
  }

  draw() {
    const ctx = this.ctx;
    const width = this.displayWidth;
    const height = this.displayHeight;

    ctx.clearRect(0, 0, width, height);

    const isLight = document.body.classList.contains('light-theme');
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
    ctx.lineWidth = Math.max(10, radius * 0.09);
    ctx.lineCap = 'round';
    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.07)';
    ctx.stroke();
    ctx.restore();

    // 2. Glowing Active Speed Arc
    if (fraction > 0.005) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, activeAngle);
      ctx.lineWidth = Math.max(10, radius * 0.09);
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

      const innerR = radius - (radius * 0.12);
      const outerR = radius - (radius * 0.05);

      const x1 = centerX + Math.cos(angle) * innerR;
      const y1 = centerY + Math.sin(angle) * innerR;
      const x2 = centerX + Math.cos(angle) * outerR;
      const y2 = centerY + Math.sin(angle) * outerR;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = 2;
      const isActive = tickFrac <= fraction;
      ctx.strokeStyle = isActive ? theme.main : (isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)');
      ctx.stroke();

      // Tick Text
      const textR = radius - (radius * 0.22);
      const tx = centerX + Math.cos(angle) * textR;
      const ty = centerY + Math.sin(angle) * textR;

      const fontSize = Math.max(9, Math.round(radius * 0.07));
      ctx.font = `600 ${fontSize}px -apple-system, sans-serif`;
      ctx.fillStyle = isActive 
        ? (isLight ? '#0f172a' : '#ffffff') 
        : (isLight ? '#64748b' : 'rgba(255, 255, 255, 0.35)');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.ticks[i].toString(), tx, ty);
      ctx.restore();
    }

    // 4. Center Needle Pointer
    ctx.save();
    const needleAngle = activeAngle;
    const needleLength = radius - (radius * 0.24);

    // Needle pivot circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fillStyle = isLight ? '#ffffff' : '#0f172a';
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
    ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
    ctx.fill();

    ctx.restore();
  }
}

window.SpeedGauge = SpeedGauge;
