// Yo soy un jefe: sigo una línea de tiempo fija (siempre el mismo patrón, para que la pelea sea justa),
// lanzo proyectiles con trayectorias predecibles y solo me pueden golpear cayéndome encima cuando estoy aturdido.

// Yo suavizo los movimientos de cada tramo.
const EASE = {
  linear: (k) => k,
  in: (k) => k * k,
  out: (k) => 1 - (1 - k) * (1 - k),
  inout: (k) => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k)),
};

export class Boss {
  // Yo recibo la definición del jefe (tamaño, vida, línea de tiempo y proyectiles).
  constructor(def) {
    this.def = def;
    this.type = def.type;
    this.w = def.w; this.h = def.h;
    this.maxHp = def.hp;
    // Yo convierto la línea de tiempo en tramos con su inicio y su posición de partida.
    this.segments = [];
    // Yo arranco desde la última posición definida para que el ciclo cierre sin saltos.
    let t = 0, pos = [...def.timeline].reverse().find((s) => s.to)?.to;
    for (const s of def.timeline) {
      const from = pos, to = s.to || pos;
      this.segments.push({ ...s, t0: t, from, to });
      t += s.t; pos = to;
    }
    this.cycle = t;
    this.reset();
  }

  // Yo vuelvo al inicio de la pelea (al empezar o cuando Blipo muere).
  reset() {
    this.t = 0;
    this.hp = this.maxHp;
    this.hurtT = 0;
    this.defeated = false;
    this.deadT = 0;
    this.hitKey = null;
    this.place();
    this.prevY = this.y;
  }

  // Yo calculo dónde estoy y si estoy aturdido según mi reloj.
  place() {
    const ct = ((this.t % this.cycle) + this.cycle) % this.cycle;
    let seg = this.segments[this.segments.length - 1], idx = this.segments.length - 1;
    for (let i = 0; i < this.segments.length; i++) { const s = this.segments[i]; if (ct >= s.t0 && ct < s.t0 + s.t) { seg = s; idx = i; break; } }
    // Yo identifico este tramo en este ciclo para aceptar un solo golpe por aturdimiento.
    this.segKey = `${Math.floor(this.t / this.cycle)}:${idx}`;
    const k = (EASE[seg.ease] || EASE.inout)(Math.min(1, (ct - seg.t0) / seg.t));
    this.x = seg.from[0] + (seg.to[0] - seg.from[0]) * k;
    this.y = seg.from[1] + (seg.to[1] - seg.from[1]) * k;
    this.vulnerable = !!seg.vulnerable;
    this.seg = seg;
    this.segK = k;
  }

  // Yo avanzo mi reloj; derrotado, solo cuento el tiempo de mi animación final.
  update(dt) {
    this.prevY = this.y;
    if (this.defeated) { this.deadT += dt; return; }
    this.t += dt;
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.place();
  }

  // Yo devuelvo los proyectiles activos ahora (dependen solo de mi reloj).
  projectiles(map) {
    if (this.defeated || !this.def.shots) return [];
    const out = [];
    const ct = ((this.t % this.cycle) + this.cycle) % this.cycle;
    for (const s of this.def.shots) {
      // Yo considero también el disparo del ciclo anterior si todavía vuela.
      for (const base of [s.at, s.at - this.cycle]) {
        const dt = ct - base;
        if (dt < 0 || dt > s.life) continue;
        const x = s.x + s.vx * dt, y = s.y + s.vy * dt + 0.5 * (s.g || 0) * dt * dt;
        // Yo dejo de existir al chocar con un bloque sólido.
        if (map && map.isSolid(Math.floor(x), Math.floor(y))) continue;
        out.push({ x, y, r: s.r || 0.4, kind: this.def.shotKind || 'rock', dt });
      }
    }
    return out;
  }

  // Yo resuelvo el contacto con Blipo: 'stomp' si me cae encima estando aturdido, 'hurt' si me toca de otra forma.
  contact(p, prevY) {
    if (this.defeated) return null;
    const i = 0.1;
    const over = p.x + p.w > this.x + i && p.x < this.x + this.w - i && p.y + p.h > this.y + i && p.y < this.y + this.h - i;
    // Yo calculo si sus pies vienen desde mi lado "de arriba" según su gravedad.
    const g = p.g || 1;
    const touchX = p.x + p.w > this.x + 0.05 && p.x < this.x + this.w - 0.05;
    let stomp = false;
    if (touchX && p.vy * g >= 0) {
      if (g > 0) stomp = prevY + p.h <= this.prevY + 0.35 && p.y + p.h >= this.y - 0.02;
      else stomp = prevY >= this.prevY + this.h - 0.35 && p.y <= this.y + this.h + 0.02;
    }
    if (stomp && this.vulnerable && this.hitKey !== this.segKey) {
      this.hp -= 1;
      this.hurtT = 1.0;
      this.hitKey = this.segKey;
      if (this.hp <= 0) { this.defeated = true; this.deadT = 0; }
      return 'stomp';
    }
    // Yo no hago daño mientras estoy aturdido o recién golpeado.
    if (over && !this.vulnerable && this.hurtT <= 0) return 'hurt';
    return null;
  }
}
