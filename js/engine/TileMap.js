// Yo convierto la definición de un nivel en una grilla consultable y extraigo sus objetos dinámicos.
import { GRID, GAME } from '../config.js';
import { T, SOLID, HAZARD_BOX, SAW_RADIUS } from '../levels/tiles.js';

export class TileMap {
  // Yo construyo el mapa a partir de { rows, start }.
  constructor(def) {
    // Yo guardo dimensiones.
    this.cols = GRID.COLS;
    this.rows = GRID.ROWS;
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
    // Yo ubico el inicio definido en el nivel.
    this.start = { x: def.start[0], y: def.start[1] };
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
          default: break;
        }
      }
    }
    // Yo indexo los bloques frágiles por posición para consultarlos rápido.
    this.crumbleAt = new Map(this.crumbles.map((c) => [c.y * this.cols + c.x, c]));
    this.bounceAt = new Map(this.bounces.map((b) => [b.y * this.cols + b.x, b]));
  }

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
    return false;
  }

  // Yo compruebo si un punto está dentro de un tipo de tile.
  isAt(px, py, char) { return this.get(Math.floor(px), Math.floor(py)) === char; }

  // Yo actualizo los bloques frágiles.
  update(dt, playerBox) {
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

  // Yo activo un bloque frágil pisado.
  triggerCrumble(x, y) {
    const c = this.crumbleAt.get(y * this.cols + x);
    if (c && c.state === 'solid') { c.state = 'shaking'; c.t = GAME.CRUMBLE_DELAY; return true; }
    return false;
  }

  // Yo reinicio los objetos que deben volver a su estado tras morir.
  resetDynamic() {
    for (const c of this.crumbles) { c.state = 'solid'; c.t = 0; }
  }
}
