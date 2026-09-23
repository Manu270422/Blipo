// Yo manejo partículas con un pool para no generar basura en memoria.
export class Particles {
  // Yo reservo un número fijo de partículas.
  constructor(max = 600) {
    this.pool = Array.from({ length: max }, () => ({ alive: false }));
    this.scale = 1;
  }

  // Yo emito un grupo de partículas en coordenadas de mundo (tiles).
  emit(x, y, { count = 10, color = '#fff', speed = 4, life = 0.6, gravity = 10, size = 0.12, spread = Math.PI * 2, angle = 0, drag = 0.9 } = {}) {
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
        life, max: life, color, gravity, size: size * (0.6 + Math.random() * 0.8), drag,
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
      ctx.fillRect(cam.sx(p.x) - s / 2, cam.sy(p.y) - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }
}
