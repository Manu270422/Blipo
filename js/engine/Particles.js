// Yo manejo partículas con un pool para no generar basura en memoria.
export class Particles {
  // Yo reservo un número fijo de partículas.
  constructor(max = 600) {
    this.pool = Array.from({ length: max }, () => ({ alive: false }));
    this.scale = 1;
  }

  // Yo emito un grupo de partículas en coordenadas de mundo (tiles).
  // Yo acepto formas: 'square' (por defecto), 'circle', 'ring', 'star', 'heart' y 'flake'; "color" puede ser una función.
  emit(x, y, { count = 10, color = '#fff', speed = 4, life = 0.6, gravity = 10, size = 0.12, spread = Math.PI * 2, angle = 0, drag = 0.9, shape = 'square', spin = 0 } = {}) {
    // Yo reduzco la cantidad si el jugador pidió menos efectos.
    const n = Math.max(1, Math.round(count * this.scale));
    for (let i = 0; i < n; i++) {
      // Yo busco una partícula libre.
      const p = this.pool.find((q) => !q.alive);
      if (!p) return;
      // Yo calculo dirección y velocidad aleatorias dentro del abanico.
      const a = angle + (Math.random() - 0.5) * spread;
      const v = speed * (0.4 + Math.random() * 0.6);
      Object.assign(p, {
        alive: true, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life, max: life, color: typeof color === 'function' ? color(i) : color, gravity, size: size * (0.6 + Math.random() * 0.8), drag,
        shape, rot: Math.random() * Math.PI * 2, spin: spin * (Math.random() - 0.5) * 2,
      });
    }
  }

  // Yo actualizo física y vida de cada partícula.
  update(dt) {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; continue; }
      p.vy += p.gravity * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
  }

  // Yo elimino todas las partículas.
  clear() { for (const p of this.pool) p.alive = false; }

  // Yo dibujo las partículas convirtiendo tiles a píxeles.
  draw(ctx, cam) {
    for (const p of this.pool) {
      if (!p.alive) continue;
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 1.5);
      ctx.fillStyle = p.color;
      const s = p.size * cam.tile * (0.5 + k * 0.5);
      const x = cam.sx(p.x), y = cam.sy(p.y);
      if (p.shape === 'square') { ctx.fillRect(x - s / 2, y - s / 2, s, s); continue; }
      drawShape(ctx, p.shape, x, y, s, p.rot, p.color);
    }
    ctx.globalAlpha = 1;
  }
}

// Yo dibujo las formas especiales de partícula (estelas y explosiones cosméticas).
function drawShape(ctx, shape, x, y, s, rot, color) {
  const r = s / 2;
  ctx.beginPath();
  if (shape === 'circle') { ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); return; }
  if (shape === 'ring') { ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, s * 0.18); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); return; }
  if (shape === 'star') {
    for (let i = 0; i < 10; i++) { const a = rot + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); return;
  }
  if (shape === 'heart') {
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.6, y - r * 1.2, x, y - r * 0.35);
    ctx.bezierCurveTo(x + r * 0.6, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
    ctx.fill(); return;
  }
  if (shape === 'flake') {
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, s * 0.16);
    for (let i = 0; i < 3; i++) { const a = rot + (i * Math.PI) / 3; ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.stroke(); return;
  }
  ctx.fillRect(x - r, y - r, s, s);
}
