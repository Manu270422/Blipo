// Yo calculo el tamaño del tile según la pantalla y sigo al jugador cuando el nivel no cabe.
import { clamp, lerp } from '../core/Format.js';
import { GRID } from '../config.js';

// Yo defino el mínimo de columnas visibles cuando hago zoom (pantallas verticales).
const MIN_VISIBLE_COLS = 21;

export class Camera {
  // Yo inicializo valores neutros.
  constructor() {
    this.tile = 20;
    this.ox = 0; this.oy = 0;
    this.viewW = 0; this.viewH = 0;
    this.shakeT = 0; this.shakeMag = 0;
    this.shakeX = 0; this.shakeY = 0;
    this.shakeEnabled = true;
  }

  // Yo recalculo la escala cuando cambia el tamaño de la pantalla o el nivel.
  resize(viewW, viewH, cols, rows, insets = { top: 0, bottom: 0 }) {
    this.viewW = viewW; this.viewH = viewH;
    this.cols = cols; this.rows = rows;
    this.insets = insets;
    // Yo reservo espacio para el HUD superior.
    const usableH = viewH - insets.top - insets.bottom;
    // Yo mido con la grilla estándar como máximo: un mapa grande se ve a la misma escala y se desplaza.
    const refCols = Math.min(cols, GRID.COLS), refRows = Math.min(rows, GRID.ROWS);
    // Yo intento que el nivel completo (o su ventana estándar) quepa en pantalla.
    const fit = Math.min(viewW / refCols, usableH / refRows);
    // Yo decido si hace falta zoom: si el tile queda muy pequeño, sigo al jugador.
    const zoomTile = Math.min(usableH / refRows, viewW / MIN_VISIBLE_COLS);
    this.tile = Math.floor((fit < 17 ? Math.max(fit, zoomTile) : fit) * 100) / 100;
    this.worldW = cols * this.tile;
    this.worldH = rows * this.tile;
    // Yo marco que la cámara debe saltar sin suavizado al próximo objetivo.
    this.snap = true;
  }

  // Yo sigo un punto del mundo (en tiles) con suavizado.
  follow(tx, ty, dt) {
    const { viewW, viewH, worldW, worldH, tile, insets } = this;
    // Yo centro el nivel si cabe y lo sigo si no cabe.
    const usableH = viewH - insets.top - insets.bottom;
    const targetX = worldW <= viewW ? (viewW - worldW) / 2 : clamp(viewW / 2 - tx * tile, viewW - worldW, 0);
    const targetY = worldH <= usableH ? insets.top + (usableH - worldH) / 2 : clamp(insets.top + usableH / 2 - ty * tile, viewH - insets.bottom - worldH, insets.top);
    // Yo salto directo tras un cambio de tamaño y suavizo el resto del tiempo.
    if (this.snap) { this.ox = targetX; this.oy = targetY; this.snap = false; }
    else { const k = 1 - Math.pow(0.0015, dt); this.ox = lerp(this.ox, targetX, k); this.oy = lerp(this.oy, targetY, k); }
    // Yo actualizo la sacudida.
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const m = this.shakeMag * Math.max(0, this.shakeT / 0.3) * tile;
      this.shakeX = (Math.random() - 0.5) * m;
      this.shakeY = (Math.random() - 0.5) * m;
    } else { this.shakeX = this.shakeY = 0; }
  }

  // Yo sacudo la cámara (magnitud en tiles).
  shake(mag = 0.3) {
    if (!this.shakeEnabled) return;
    this.shakeMag = mag;
    this.shakeT = 0.3;
  }

  // Yo convierto X del mundo a pantalla.
  sx(x) { return Math.round(this.ox + this.shakeX) + x * this.tile; }
  // Yo convierto Y del mundo a pantalla.
  sy(y) { return Math.round(this.oy + this.shakeY) + y * this.tile; }
}
