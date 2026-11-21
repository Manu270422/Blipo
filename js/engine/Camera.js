// Yo escalo el nivel para cubrir la pantalla y sigo al jugador cuando el mapa excede el viewport.
import { clamp, lerp } from '../core/Format.js';
import { GRID } from '../config.js';

export class Camera {
  constructor() {
    this.tile = 20;
    this.ox = 0; this.oy = 0;
    this.viewW = 0; this.viewH = 0;
    this.minX = 0; this.minY = 0;
    this.shakeT = 0;
    this.shakeMag = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeEnabled = true;
  }

  resize(viewW, viewH, cols, rows, insets = { top: 0, bottom: 0 }) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.insets = insets;
    // La grilla base mantiene el zoom de los mapas grandes.
    const refCols = Math.min(cols, GRID.COLS);
    const refRows = Math.min(rows, GRID.ROWS);
    this.tile = Math.ceil(Math.max(viewW / refCols, viewH / refRows) * 100) / 100;
    this.worldW = cols * this.tile;
    this.worldH = rows * this.tile;
    this.minX = Math.min(0, viewW - this.worldW);
    this.minY = Math.min(0, viewH - this.worldH);
    this.snap = true;
  }

  follow(tx, ty, dt) {
    const { viewW, viewH, tile, minX, minY } = this;
    const px = tx * tile;
    const py = ty * tile;
    const targetX = clamp(viewW / 2 - px, minX, 0);
    const targetY = clamp(viewH / 2 - py, minY, 0);

    if (this.snap) {
      this.ox = targetX;
      this.oy = targetY;
      this.snap = false;
    } else {
      const k = 1 - Math.pow(0.0015, dt);
      // Limito el retraso del seguimiento al reaparecer o teletransportarse.
      const x = clamp(lerp(this.ox, targetX, k), viewW * 0.25 - px, viewW * 0.75 - px);
      const y = clamp(lerp(this.oy, targetY, k), viewH * 0.25 - py, viewH * 0.75 - py);
      this.ox = clamp(x, minX, 0);
      this.oy = clamp(y, minY, 0);
    }

    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const m = this.shakeMag * Math.max(0, this.shakeT / 0.3) * tile;
      this.shakeX = (Math.random() - 0.5) * m;
      this.shakeY = (Math.random() - 0.5) * m;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  shake(mag = 0.3) {
    if (!this.shakeEnabled) return;
    this.shakeMag = mag;
    this.shakeT = 0.3;
  }

  // Limito también la sacudida para mantener el mapa pegado a los bordes.
  sx(x) { return clamp(Math.round(this.ox + this.shakeX), this.minX, 0) + x * this.tile; }
  sy(y) { return clamp(Math.round(this.oy + this.shakeY), this.minY, 0) + y * this.tile; }
}
