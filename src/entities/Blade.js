/**
 * Blade - Handles user swipe trail, pointer events, rendering blade trail and spark particles
 */

export const BLADE_SKINS = {
  classic: {
    id: 'classic',
    name: 'Katana Silver',
    glowColor: 'rgba(120, 200, 255, 0.8)',
    coreColor: '#ffffff',
    trailColor: 'rgba(200, 230, 255, 0.9)',
    sparkColor: '#bbf2f6',
    icon: '⚔️',
  },
  fire: {
    id: 'fire',
    name: 'Flame Blade',
    glowColor: 'rgba(255, 60, 20, 0.85)',
    coreColor: '#fffb96',
    trailColor: 'rgba(255, 120, 30, 0.95)',
    sparkColor: '#ff7b25',
    icon: '🔥',
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber Neon',
    glowColor: 'rgba(255, 0, 128, 0.85)',
    coreColor: '#00f7ff',
    trailColor: 'rgba(220, 20, 200, 0.9)',
    sparkColor: '#00f7ff',
    icon: '⚡',
  },
  shadow: {
    id: 'shadow',
    name: 'Shadow Void',
    glowColor: 'rgba(155, 40, 255, 0.85)',
    coreColor: '#e0b0ff',
    trailColor: 'rgba(110, 20, 200, 0.9)',
    sparkColor: '#d685ff',
    icon: '🌌',
  },
  gold: {
    id: 'gold',
    name: 'Golden Emperor',
    glowColor: 'rgba(255, 200, 50, 0.9)',
    coreColor: '#ffffff',
    trailColor: 'rgba(255, 215, 0, 0.95)',
    sparkColor: '#ffe57f',
    icon: '👑',
  },
};

export class Blade {
  constructor(canvas) {
    this.canvas = canvas;

    this.points = [];
    this.maxPoints = 16;
    this.maxTrailAge = 120;

    this.isMouseDown = false;
    this.isSwiping = false;
    this.lastPos = null;

    this.currentSkin = BLADE_SKINS.classic;

    this.sparks = [];
    this.maxSparks = 20;

    this.minSliceSpeed = 120;

    this.canvasRect = null;

    this.isMobile =
      window.matchMedia('(pointer: coarse)').matches;

    this.setupListeners();
    this.updateCanvasRect();
  }

  setSkin(skinId) {
    if (BLADE_SKINS[skinId]) {
      this.currentSkin = BLADE_SKINS[skinId];
    }
  }

  updateCanvasRect() {
    this.canvasRect = this.canvas.getBoundingClientRect();
  }

  setupListeners() {
    this.canvas.style.touchAction = 'none';

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      this.isMouseDown = true;

      const pos = this.getCanvasCoords(e);

      this.points.length = 0;
      this.addPoint(pos.x, pos.y);

      this.lastPos = pos;

      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch {}
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.isMouseDown) return;

      const pos = this.getCanvasCoords(e);
      this.handleMove(pos.x, pos.y);
    });

    const endSwipe = () => {
      this.isMouseDown = false;
      this.lastPos = null;
      this.isSwiping = false;
    };

    this.canvas.addEventListener('pointerup', endSwipe);
    this.canvas.addEventListener('pointercancel', endSwipe);
    this.canvas.addEventListener('lostpointercapture', endSwipe);

    window.addEventListener('resize', () => {
      this.updateCanvasRect();
    });
  }

  getCanvasCoords(e) {
    const rect = this.canvasRect;

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  handleMove(x, y) {
    const last = this.lastPos;

    if (last) {
      const dx = x - last.x;
      const dy = y - last.y;
      const distSq = dx * dx + dy * dy;

      if (distSq > 225) {
        const dist = Math.sqrt(distSq);

        // Keep spark workload low on mobile.
        if (!this.isMobile || this.sparks.length < this.maxSparks) {
          this.emitSparks(x, y, dx, dy);
        }

        this.isSwiping = true;
      }
    }

    this.addPoint(x, y);

    this.lastPos = {
      x,
      y,
    };
  }

  addPoint(x, y) {
    const now = performance.now();
    const last = this.points[this.points.length - 1];

    // Don't create excessive points from high-frequency touch events.
    if (last) {
      const dx = x - last.x;
      const dy = y - last.y;

      if (dx * dx + dy * dy < 16) {
        return;
      }
    }

    this.points.push({
      x,
      y,
      time: now,
    });

    if (this.points.length > this.maxPoints) {
      this.points.shift();
    }
  }

  emitSparks(x, y, dx, dy) {
    if (this.sparks.length >= this.maxSparks) {
      return;
    }

    const count = this.isMobile ? 1 : 2;

    for (let i = 0; i < count; i++) {
      if (this.sparks.length >= this.maxSparks) {
        break;
      }

      const angle =
        Math.atan2(dy, dx) +
        (Math.random() - 0.5) * 1.5;

      const speed = Math.random() * 80 + 40;

      this.sparks.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1.5,
        alpha: 1,
        life: 0.35,
        maxLife: 0.35,
        color: this.currentSkin.sparkColor,
      });
    }
  }

  update(dt) {
    const now = performance.now();

    // Remove expired trail points.
    let firstAlive = 0;

    while (
      firstAlive < this.points.length &&
      now - this.points[firstAlive].time >= this.maxTrailAge
    ) {
      firstAlive++;
    }

    if (firstAlive > 0) {
      this.points.splice(0, firstAlive);
    }

    // Update sparks.
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];

      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.life -= dt;

      if (sp.life <= 0) {
        this.sparks.splice(i, 1);
      } else {
        sp.alpha = sp.life / sp.maxLife;
      }
    }
  }

  draw(ctx) {
    const now = performance.now();

    // Sparks.
    if (this.sparks.length > 0) {
      ctx.save();

      for (const sp of this.sparks) {
        ctx.globalAlpha = sp.alpha;
        ctx.fillStyle = sp.color;

        ctx.beginPath();
        ctx.arc(
          sp.x,
          sp.y,
          sp.size,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      ctx.restore();
    }

    if (this.points.length < 2) {
      return;
    }

    ctx.save();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Glow.
    ctx.strokeStyle = this.currentSkin.glowColor;
    ctx.beginPath();

    let hasGlow = false;

    for (let i = 1; i < this.points.length; i++) {
      const p0 = this.points[i - 1];
      const p1 = this.points[i];

      const ageRatio =
        (now - p1.time) / this.maxTrailAge;

      if (ageRatio >= 1) continue;

      if (!hasGlow) {
        ctx.moveTo(p0.x, p0.y);
        hasGlow = true;
      }

      ctx.lineTo(p1.x, p1.y);
    }

    if (hasGlow) {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 10;
      ctx.stroke();
    }

    // Core.
    ctx.strokeStyle = this.currentSkin.coreColor;
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;

    ctx.beginPath();

    let hasCore = false;

    for (let i = 1; i < this.points.length; i++) {
      const p0 = this.points[i - 1];
      const p1 = this.points[i];

      const ageRatio =
        (now - p1.time) / this.maxTrailAge;

      if (ageRatio >= 1) continue;

      if (!hasCore) {
        ctx.moveTo(p0.x, p0.y);
        hasCore = true;
      }

      ctx.lineTo(p1.x, p1.y);
    }

    if (hasCore) {
      ctx.stroke();
    }

    ctx.restore();
  }

  getSegments() {
    if (this.points.length < 2) {
      return [];
    }

    const now = performance.now();
    const segs = [];

    const start = Math.max(
      1,
      this.points.length - 6
    );

    for (let i = start; i < this.points.length; i++) {
      const p0 = this.points[i - 1];
      const p1 = this.points[i];

      if (now - p1.time < 70) {
        segs.push({
          x1: p0.x,
          y1: p0.y,
          x2: p1.x,
          y2: p1.y,
        });
      }
    }

    return segs;
  }
}