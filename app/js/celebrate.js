/** Short confetti burst on a full-screen canvas; removes itself when done. */

const COLORS = ['#ffffff', '#ffd500', '#c41e3a', '#ff5800', '#009e60', '#0051ba'];

export function confetti({ count = 160, duration = 2600 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const particles = Array.from({ length: count }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.2,
    y: h * 0.4,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 14 - 4,
    size: 6 + Math.random() * 6,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));

  const start = performance.now();
  const frame = (now) => {
    const t = (now - start) / duration;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = Math.max(0, Math.min(1, (1 - t) * 3));
    for (const p of particles) {
      p.vy += 0.35;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (t < 1) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
