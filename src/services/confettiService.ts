/**
 * High-performance, lightweight HTML5 Canvas Confetti Engine
 * Zero external dependencies. Renders 60fps pastel ribbons, stars, and sparkles.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  shape: 'rect' | 'circle' | 'star';
  opacity: number;
  decay: number;
}

// Vivid Pastel Palette for teen/student gamification
const VIVID_PASTEL_COLORS = [
  '#FF7675', // Coral Pink
  '#74B9FF', // Sky Blue
  '#55EFC4', // Mint Green
  '#FFEAA7', // Sunshine Lemon
  '#A29BFE', // Soft Lavender
  '#FD79A8', // Candy Bubblegum
  '#FEEAA7', // Banana Pastel
  '#81ECEC', // Aqua Breeze
  '#FAB1A0', // Peach
  '#FF9FF3', // Vivid Neon Pink
];

class ConfettiEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private animationFrameId: number | null = null;

  private ensureCanvas(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.canvas && this.ctx) return true;

    let canvasEl = document.getElementById('wordloop-confetti-canvas') as HTMLCanvasElement;
    if (!canvasEl) {
      canvasEl = document.createElement('canvas');
      canvasEl.id = 'wordloop-confetti-canvas';
      canvasEl.style.position = 'fixed';
      canvasEl.style.inset = '0';
      canvasEl.style.width = '100vw';
      canvasEl.style.height = '100vh';
      canvasEl.style.pointerEvents = 'none';
      canvasEl.style.zIndex = '99999';
      document.body.appendChild(canvasEl);
    }

    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.resize();

    window.addEventListener('resize', this.handleResize);
    return Boolean(this.ctx);
  }

  private handleResize = () => {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  };

  private resize() {
    this.handleResize();
  }

  /**
   * Explodes celebratory confetti from screen center or custom coordinates
   */
  public fire(options?: {
    x?: number; // Normalized 0 ~ 1
    y?: number; // Normalized 0 ~ 1
    particleCount?: number;
    spread?: number;
    shapes?: ('rect' | 'circle' | 'star')[];
  }) {
    if (!this.ensureCanvas() || !this.canvas || !this.ctx) return;

    const count = options?.particleCount || 60;
    const originX = (options?.x ?? 0.5) * this.canvas.width;
    const originY = (options?.y ?? 0.4) * this.canvas.height;
    const spread = options?.spread ?? 70;
    const shapes = options?.shapes || ['rect', 'circle', 'star'];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI / 180) * (270 + (Math.random() * spread - spread / 2));
      const speed = 4 + Math.random() * 8;
      const color = VIVID_PASTEL_COLORS[Math.floor(Math.random() * VIVID_PASTEL_COLORS.length)];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];

      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
        vy: Math.sin(angle) * speed,
        size: shape === 'star' ? 6 + Math.random() * 5 : 5 + Math.random() * 6,
        color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        shape,
        opacity: 1,
        decay: 0.009 + Math.random() * 0.008,
      });
    }

    if (!this.animationFrameId) {
      this.loop();
    }
  }

  /**
   * Dual Cannon Side Burst (left and right corners) for high milestones or game victory
   */
  public fireSideCannons() {
    this.fire({ x: 0.1, y: 0.8, particleCount: 45, spread: 55 });
    setTimeout(() => {
      this.fire({ x: 0.9, y: 0.8, particleCount: 45, spread: 55 });
    }, 120);
  }

  /**
   * Golden star shower for perfect scores / combo streaks
   */
  public fireGoldenStars() {
    this.fire({
      x: 0.5,
      y: 0.2,
      particleCount: 50,
      spread: 90,
      shapes: ['star', 'circle'],
    });
  }

  private loop = () => {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // subtle gravity
      p.vx *= 0.985; // friction
      p.rotation += p.rotationSpeed;
      p.opacity -= p.decay;

      if (p.opacity <= 0 || p.y > this.canvas.height + 50) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else if (p.shape === 'circle') {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.shape === 'star') {
        this.drawStar(this.ctx, 0, 0, 5, p.size, p.size / 2);
      }

      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animationFrameId = requestAnimationFrame(this.loop);
    } else {
      this.animationFrameId = null;
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  };

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
  ) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }
}

export const confettiService = new ConfettiEngine();
