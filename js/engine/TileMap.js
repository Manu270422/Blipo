// Yo convierto la definición de un nivel en una grilla consultable y extraigo sus objetos dinámicos.
import { GRID, GAME } from '../config.js';
import { T, SOLID, HAZARD_BOX, SAW_RADIUS, BELT_DIR, JET, ICICLE, WIND, jetPhase } from '../levels/tiles.js';
import { Mover } from '../entities/Mover.js';

export class TileMap {
  // Yo construyo el mapa a partir de { rows, start, movers }.
  constructor(def) {
    // Yo tomo las dimensiones del propio mapa: así acepto niveles más grandes que la grilla estándar.
    this.cols = Math.max(...def.rows.map((r) => r.length)) || GRID.COLS;
    this.rows = def.rows.length || GRID.ROWS;
    // Yo copio las filas como matriz de caracteres para poder modificarla.
    this.grid = def.rows.map((r) => r.padEnd(this.cols, '.').slice(0, this.cols).split(''));
    // Yo preparo las colecciones de objetos dinámicos.
    this.gems = [];
    this.portalsIn = [];
    this.portalOut = null;
    this.exits = [];
    this.checkpoints = [];
    this.crumbles = [];
    this.bounces = [];
    this.saws = [];
    this.belts = [];
    this.jets = [];
    this.icicles = [];
    // Yo creo las zonas de viento descritas en el nivel ({ x, y, w, h, dir, force, period, on, phase }).
    this.winds = (def.winds || []).map((w) => ({ force: WIND.FORCE, period: 0, on: 0, phase: 0, ...w, state: 'on' }));
    // Yo creo las plataformas móviles descritas en el nivel.
    this.movers = (def.movers || []).map((m) => new Mover(m));
    // Yo llevo el reloj del mapa para las trampas con ritmo.
    this.time = 0;
    // Yo ubico el inicio definido en el nivel.
    this.start = def.start ? { x: def.start[0], y: def.start[1] } : { x: 1, y: 1 };
    // Yo recorro la grilla para extraer objetos.
    this.extract();
  }

  // Yo separo los objetos dinámicos de la geometría estática.
  extract() {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const c = this.grid[y][x];
        switch (c) {
          case T.GEM: this.gems.push({ x, y, index: this.gems.length, taken: false }); this.grid[y][x] = T.EMPTY; break;
          case T.CHECKPOINT: this.checkpoints.push({ x, y, active: false }); this.grid[y][x] = T.EMPTY; break;
          case T.START: this.start = { x, y }; this.grid[y][x] = T.EMPTY; break;
          case T.PORTAL_IN: this.portalsIn.push({ x, y }); break;
          case T.PORTAL_OUT: this.portalOut = { x, y }; break;
          case T.EXIT: this.exits.push({ x, y }); break;
          case T.CRUMBLE: this.crumbles.push({ x, y, state: 'solid', t: 0 }); break;
          case T.BOUNCE: this.bounces.push({ x, y, t: 0 }); break;
          case T.SAW: this.saws.push({ x, y }); break;
          case T.BELT_LEFT: case T.BELT_RIGHT: this.belts.push({ x, y, dir: BELT_DIR[c] }); break;
          case T.JET_A: case T.JET_B: this.jets.push({ x, y, ch: c }); break;
          case T.ICICLE: this.icicles.push({ x, y, fy: y, vy: 0, state: 'hang', t: 0 }); this.grid[y][x] = T.EMPTY; break;
          default: break;
        }
      }
    }
    // Yo indexo los bloques frágiles por posición para consultarlos rápido.
    this.crumbleAt = new Map(this.crumbles.map((c) => [c.y * this.cols + c.x, c]));
    this.bounceAt = new Map(this.bounces.map((b) => [b.y * this.cols + b.x, b]));
    // Yo corto cada llamarada en el primer bloque sólido que encuentre por encima.
    for (const j of this.jets) {
      let reach = 0;
      while (reach < JET.HEIGHT && !SOLID.has(this.get(j.x, j.y - 1 - Math.floor(reach)))) reach += 1;
      j.reach = Math.min(JET.HEIGHT, reach);
      j.phase = jetPhase(j.ch, 0);
    }
  }

  // Yo indico si una celda es hielo resbaloso.
  isIce(x, y) { return this.get(x, y) === T.ICE; }

  // Yo devuelvo el empuje del viento en un punto: { x } en tiles/s y { y } como aceleración vertical.
  windAt(px, py) {
    let x = 0, y = 0;
    for (const w of this.winds) {
      if (w.state !== 'on' || px < w.x || px >= w.x + w.w || py < w.y || py >= w.y + w.h) continue;
      if (w.dir === 'up') y -= WIND.LIFT * (w.force / WIND.FORCE);
      else x += (w.dir === 'left' ? -1 : 1) * w.force;
    }
    return { x, y };
  }

  // Yo devuelvo hacia dónde arrastra la cinta de una celda (0 si no es cinta).
  beltDir(x, y) { return BELT_DIR[this.get(x, y)] || 0; }

  // Yo devuelvo el carácter de una celda (fuera del mapa devuelvo vacío).
  get(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return T.EMPTY;
    return this.grid[y][x];
  }

  // Yo decido si una celda bloquea el movimiento.
  isSolid(x, y) {
    // Yo trato los bordes laterales y el techo como muros invisibles.
    if (x < 0 || x >= this.cols || y < 0) return true;
    // Yo dejo el fondo abierto: caer fuera del mapa es morir.
    if (y >= this.rows) return false;
    const c = this.grid[y][x];
    // Yo consulto el estado del bloque frágil.
    if (c === T.CRUMBLE) return this.crumbleAt.get(y * this.cols + x).state !== 'gone';
    return SOLID.has(c);
  }

  // Yo compruebo si una caja toca algún peligro.
  hitsHazard(box) {
    // Yo recorro solo las celdas que toca la caja.
    const x0 = Math.floor(box.x), x1 = Math.floor(box.x + box.w);
    const y0 = Math.floor(box.y), y1 = Math.floor(box.y + box.h);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const hb = HAZARD_BOX[this.get(x, y)];
        // Yo comparo rectángulos (AABB).
        if (hb && box.x < x + hb.x1 && box.x + box.w > x + hb.x0 && box.y < y + hb.y1 && box.y + box.h > y + hb.y0) return true;
      }
    }
    // Yo reviso las sierras como círculos.
    for (const s of this.saws) {
      const cx = s.x + 0.5, cy = s.y + 0.5;
      const nx = Math.max(box.x, Math.min(cx, box.x + box.w));
      const ny = Math.max(box.y, Math.min(cy, box.y + box.h));
      if ((cx - nx) ** 2 + (cy - ny) ** 2 < SAW_RADIUS ** 2) return true;
    }
    // Yo reviso las llamaradas encendidas.
    for (const j of this.jets) {
      if (j.phase !== 'on' || j.reach <= 0) continue;
      const fx0 = j.x + 0.22, fx1 = j.x + 0.78, fy0 = j.y - j.reach, fy1 = j.y;
      if (box.x < fx1 && box.x + box.w > fx0 && box.y < fy1 && box.y + box.h > fy0) return true;
    }
    // Yo reviso los carámbanos (colgando, temblando o cayendo).
    for (const c of this.icicles) {
      if (c.state === 'gone') continue;
      if (box.x < c.x + 0.72 && box.x + box.w > c.x + 0.28 && box.y < c.fy + 0.85 && box.y + box.h > c.fy + 0.05) return true;
    }
    return false;
  }

  // Yo compruebo si un punto está dentro de un tipo de tile.
  isAt(px, py, char) { return this.get(Math.floor(px), Math.floor(py)) === char; }

  // Yo actualizo los bloques frágiles.
  update(dt, playerBox) {
    // Yo avanzo el reloj, las plataformas móviles y las llamaradas.
    this.time += dt;
    for (const m of this.movers) m.update(this.time, dt);
    for (const j of this.jets) {
      const ph = jetPhase(j.ch, this.time);
      j.ignited = ph === 'on' && j.phase !== 'on';
      j.phase = ph;
    }
    // Yo activo las ráfagas de viento según su ritmo (period 0 = viento constante).
    for (const w of this.winds) {
      if (!w.period) continue;
      const t = (((this.time + w.phase) % w.period) + w.period) % w.period;
      w.state = t < w.on ? 'on' : t > w.period - WIND.WARN ? 'warn' : 'off';
    }
    this.updateIcicles(dt, playerBox);
    for (const c of this.crumbles) {
      if (c.state === 'shaking') {
        // Yo cuento hacia abajo y lo hago caer.
        c.t -= dt;
        if (c.state === 'shaking' && c.t <= 0) { c.state = 'gone'; c.t = GAME.CRUMBLE_RESPAWN; c.justFell = true; }
      } else if (c.state === 'gone') {
        c.t -= dt;
        // Yo lo regenero solo si el jugador no está encima de su espacio.
        const overlap = playerBox && playerBox.x < c.x + 1 && playerBox.x + playerBox.w > c.x && playerBox.y < c.y + 1 && playerBox.y + playerBox.h > c.y;
        if (c.t <= 0 && !overlap) c.state = 'solid';
      }
    }
    // Yo relajo la animación de los resortes.
    for (const b of this.bounces) b.t = Math.max(0, b.t - dt * 4);
  }

  // Yo suelto los carámbanos cuando Blipo pasa debajo y los hago caer hasta romperse.
  updateIcicles(dt, p) {
    for (const c of this.icicles) {
      c.cracked = false; c.shattered = false;
      if (c.state === 'hang') {
        if (!p) continue;
        const cx = p.x + p.w / 2;
        if (Math.abs(cx - (c.x + 0.5)) < ICICLE.RANGE && p.y > c.y && this.clearBelow(c.x, c.y, p.y)) { c.state = 'shake'; c.t = ICICLE.SHAKE; c.cracked = true; }
      } else if (c.state === 'shake') {
        c.t -= dt;
        if (c.t <= 0) { c.state = 'fall'; c.vy = 0; }
      } else if (c.state === 'fall') {
        c.vy = Math.min(ICICLE.MAX_FALL, c.vy + ICICLE.GRAVITY * dt);
        c.fy += c.vy * dt;
        // Yo me rompo al chocar con algo sólido o al salir del mapa.
        if (this.isSolid(c.x, Math.floor(c.fy + 0.9)) || c.fy > this.rows) { c.state = 'gone'; c.t = ICICLE.RESPAWN; c.shattered = true; }
      } else if (c.state === 'gone') {
        c.t -= dt;
        if (c.t <= 0) { c.state = 'hang'; c.fy = c.y; }
      }
    }
  }

  // Yo compruebo que no haya bloques entre el carámbano y Blipo.
  clearBelow(x, y0, y1) {
    for (let y = y0 + 1; y < Math.floor(y1); y++) if (this.isSolid(x, y)) return false;
    return true;
  }

  // Yo activo un bloque frágil pisado.
  triggerCrumble(x, y) {
    const c = this.crumbleAt.get(y * this.cols + x);
    if (c && c.state === 'solid') { c.state = 'shaking'; c.t = GAME.CRUMBLE_DELAY; return true; }
    return false;
  }

  // Yo reinicio los objetos que deben volver a su estado tras morir.
  resetDynamic() {
    for (const c of this.crumbles) { c.state = 'solid'; c.t = 0; }
    for (const c of this.icicles) { c.state = 'hang'; c.fy = c.y; c.vy = 0; c.t = 0; }
  }
}
