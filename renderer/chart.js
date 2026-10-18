/**
 * Real-time Throughput Canvas Line Chart with responsive scaling & light/dark theme
 */
class LiveThroughputChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.points = [];
    this.maxPoints = 70;
    this.maxY = 20;

    this.setupHiDPI();
    window.addEventListener('resize', () => {
      this.setupHiDPI();
      this.draw();
    });
    this.draw();
  }

  setupHiDPI() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || 460;
    const height = rect.height || 210;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
    this.displayWidth = width;
    this.displayHeight = height;
  }

  reset() {
    this.points = [];
    this.maxY = 20;
    this.draw();
  }

  addPoint(val, type = 'download') {
    this.points.push({ val: Math.max(0, val), type });
    if (this.points.length > this.maxPoints) {
      this.points.shift();
    }

    // Dynamic Y max with buffer
    const maxVal = Math.max(...this.points.map(p => p.val), 10);
    this.maxY = Math.max(20, Math.ceil(maxVal * 1.25));

    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;

    ctx.clearRect(0, 0, w, h);

    const isLight = document.body.classList.contains('light-theme');
    const padding = { top: 20, right: 16, bottom: 24, left: 40 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    if (chartW <= 0 || chartH <= 0) return;

    // 1. Grid Lines & Axis Labels
    const gridRows = 4;
    ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= gridRows; i++) {
      const yFrac = i / gridRows;
      const yVal = Math.round(this.maxY * (1 - yFrac));
      const py = padding.top + yFrac * chartH;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(padding.left, py);
      ctx.lineTo(w - padding.right, py);
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.3)';
      ctx.fillText(yVal + 'M', padding.left - 6, py);
      ctx.restore();
    }

    if (this.points.length < 2) {
      // Empty state hint
      ctx.save();
      ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.35)' : 'rgba(255, 255, 255, 0.2)';
      ctx.font = '12px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Awaiting speed test stream...', w / 2, h / 2);
      ctx.restore();
      return;
    }

    const pts = this.points;
    const stepX = chartW / (this.maxPoints - 1);
    const startX = padding.left + (this.maxPoints - pts.length) * stepX;

    const coords = pts.map((p, i) => {
      const px = startX + i * stepX;
      const normY = Math.min(1, p.val / this.maxY);
      const py = padding.top + (1 - normY) * chartH;
      return { x: px, y: py, type: p.type, val: p.val };
    });

    const currentType = pts[pts.length - 1].type;
    const isDl = currentType === 'download';

    const strokeColor = isDl 
      ? (isLight ? '#0284c7' : '#00f2fe')
      : (isLight ? '#d90479' : '#9d4edd');
    
    const gradientTop = isDl 
      ? (isLight ? 'rgba(2, 132, 199, 0.25)' : 'rgba(0, 242, 254, 0.35)') 
      : (isLight ? 'rgba(217, 4, 121, 0.25)' : 'rgba(157, 78, 221, 0.35)');
    const gradientBottom = 'rgba(0, 0, 0, 0)';

    // 2. Gradient Fill
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(coords[0].x, padding.top + chartH);

    for (let i = 0; i < coords.length; i++) {
      ctx.lineTo(coords[i].x, coords[i].y);
    }
    ctx.lineTo(coords[coords.length - 1].x, padding.top + chartH);
    ctx.closePath();

    const areaGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    areaGrad.addColorStop(0, gradientTop);
    areaGrad.addColorStop(1, gradientBottom);
    ctx.fillStyle = areaGrad;
    ctx.fill();
    ctx.restore();

    // 3. Smooth Curve Line
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);

    for (let i = 0; i < coords.length - 1; i++) {
      const xc = (coords[i].x + coords[i + 1].x) / 2;
      const yc = (coords[i].y + coords[i + 1].y) / 2;
      ctx.quadraticCurveTo(coords[i].x, coords[i].y, xc, yc);
    }
    ctx.lineTo(coords[coords.length - 1].x, coords[coords.length - 1].y);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();

    // 4. Current Point Pulse
    const last = coords[coords.length - 1];
    ctx.save();
    ctx.beginPath();
    ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
  }
}

window.LiveThroughputChart = LiveThroughputChart;
